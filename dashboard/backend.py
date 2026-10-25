"""FastAPI backend for the static Server Response Time Monitor dashboard."""
from __future__ import annotations

import math
from collections import deque
from datetime import datetime, timezone
from statistics import mean, pvariance
from time import perf_counter
from typing import Any

import psutil
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Server Response Time Monitor API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_RECORDS = 1000
records: deque[dict[str, Any]] = deque(maxlen=MAX_RECORDS)
EXCLUDED_PATHS = {
    "/", "/health", "/docs", "/openapi.json", "/redoc",
    "/api/metrics", "/api/response-times", "/api/server-metrics", "/api/sla",
}


def server_usage() -> tuple[float, float]:
    try:
        return float(psutil.cpu_percent(interval=None)), float(psutil.virtual_memory().percent)
    except Exception:
        return 0.0, 0.0


@app.middleware("http")
async def collect_request_measurements(request: Request, call_next):
    started = perf_counter()
    status_code = 500
    try:
        response = await call_next(request)
        status_code = response.status_code
        return response
    finally:
        elapsed = max(perf_counter() - started, 0.0)
        path = request.url.path
        if path not in EXCLUDED_PATHS and not path.startswith("/docs/"):
            cpu, ram = server_usage()
            elapsed_ms = elapsed * 1000.0
            records.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "endpoint": path,
                "status_code": status_code,
                "success": 200 <= status_code < 400,
                "response_time_ms": elapsed_ms,
                "response_time": elapsed,
                "cpu_percent": cpu,
                "ram_percent": ram,
            })


@app.get("/")
def root():
    return {"name": "Server Response Time Monitor API", "health": "/health", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok", "records": len(records)}


@app.get("/api/probe")
def probe():
    """Dashboard probe; its actual HTTP latency is recorded by middleware."""
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/metrics")
def metrics():
    values = [r["response_time"] for r in records]
    ordered = sorted(values)
    n = len(values)
    avg = mean(values) if n else 0.0
    def pct(p: float) -> float:
        if not ordered:
            return 0.0
        position = (len(ordered) - 1) * p
        low = int(position)
        high = min(low + 1, len(ordered) - 1)
        return ordered[low] + (ordered[high] - ordered[low]) * (position - low)
    return {
        "requests": n,
        "mean": avg,
        "variance": pvariance(values) if n else 0.0,
        "lambda": 1.0 / avg if avg > 0 else 0.0,
        "p95": pct(0.95),
        "p99": pct(0.99),
    }


@app.get("/api/response-times")
def response_times():
    return {"response_times": [r["response_time"] for r in records]}


@app.get("/api/server-metrics")
def server_metrics():
    return {"metrics": list(records)}


@app.get("/api/sla")
def sla():
    threshold_ms = 100.0
    target_percent = 99.0
    values = [r["response_time"] for r in records]
    total = len(values)
    compliant = sum(v <= threshold_ms / 1000.0 for v in values)
    violations = total - compliant
    actual = compliant / total * 100.0 if total else 0.0
    avg = mean(values) if values else 0.0
    rate = 1.0 / avg if avg > 0 else 0.0
    model_violation = math.exp(-rate * threshold_ms / 1000.0) * 100.0 if rate else 0.0
    model_compliance = 100.0 - model_violation if rate else 0.0
    status = "NO DATA" if total == 0 else ("PASS" if actual >= target_percent else "VIOLATION")
    return {
        "threshold_ms": threshold_ms,
        "target_percent": target_percent,
        "actual_compliance_percent": actual,
        "actual_violation_percent": 100.0 - actual if total else 0.0,
        "violating_requests": violations,
        "compliant_requests": compliant,
        "total_requests": total,
        "model_compliance_percent": model_compliance,
        "model_violation_percent": model_violation,
        "lambda": rate,
        "sla_status": status,
    }
