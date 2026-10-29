#!/usr/bin/env python3
"""Validate and analyze timestamped monitoring data without inventing request-level samples.

Usage:
  python data_analysis/run_analysis.py path/to/sofie.csv --out data_analysis/outputs
"""
from __future__ import annotations
import argparse
from pathlib import Path
import json
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

LATENCY_COLUMNS = [
    "vllm_e2e_latency_p50_s", "vllm_e2e_latency_p95_s",
    "vllm_e2e_latency_p99_s", "vllm_ttft_p50_s",
    "gateway_latency_p50_s", "gateway_latency_p95_s",
]
CORRELATION_COLUMNS = [
    "vllm_e2e_latency_p50_s", "vllm_e2e_latency_p95_s",
    "vllm_e2e_latency_p99_s", "vllm_requests_per_s",
    "vllm_waiting", "gpu_util_pct", "node_cpu_used_pct",
    "node_ram_used_pct", "vllm_queue_time_p50_s",
]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", help="Input monitoring CSV; original is never modified")
    parser.add_argument("--out", default="data_analysis/outputs", help="Output folder")
    args = parser.parse_args()
    source, out = Path(args.csv), Path(args.out)
    if not source.is_file():
        raise SystemExit(f"Input CSV not found: {source}")
    out.mkdir(parents=True, exist_ok=True)
    graphs = out / "graphs"
    graphs.mkdir(parents=True, exist_ok=True)

    raw = pd.read_csv(source)
    if raw.empty:
        raise SystemExit("Input CSV has no data rows.")
    original_rows, original_cols = raw.shape
    missing_by_col = raw.isna().sum().sort_values(ascending=False)
    missing_by_col.rename("missing_count").to_csv(out / "missing_values_by_column.csv")
    duplicate_rows = int(raw.duplicated().sum())

    timestamp_col = "timestamp_utc"
    if timestamp_col in raw:
        parsed_ts = pd.to_datetime(raw[timestamp_col], errors="coerce", utc=True)
        invalid_timestamps = int(parsed_ts.isna().sum())
        duplicate_timestamps = int(parsed_ts.dropna().duplicated().sum())
    else:
        parsed_ts = None
        invalid_timestamps = original_rows
        duplicate_timestamps = 0

    numeric = raw.select_dtypes(include="number").columns.tolist()
    negative_numeric_cells = int((raw[numeric] < 0).sum().sum()) if numeric else 0
    # Keep rows and numeric values intact; only normalize the timestamp field in export.
    clean = raw.copy()
    if parsed_ts is not None:
        clean[timestamp_col] = parsed_ts
    clean.to_csv(out / "cleaned_dataset.csv", index=False, date_format="%Y-%m-%dT%H:%M:%SZ")

    if numeric:
        raw[numeric].describe(percentiles=[.5, .9, .95, .99]).T.to_csv(out / "numeric_summary.csv")
    outlier_records = []
    for col in numeric:
        values = raw[col].dropna()
        if values.empty:
            continue
        q1, q3 = values.quantile(.25), values.quantile(.75)
        iqr = q3 - q1
        low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        count = int(((values < low) | (values > high)).sum())
        outlier_records.append({
            "column": col, "non_missing_n": len(values), "q1": q1, "q3": q3,
            "iqr": iqr, "lower_iqr_fence": low, "upper_iqr_fence": high,
            "outlier_count": count, "outlier_percent": 100 * count / len(values)
        })
    pd.DataFrame(outlier_records).sort_values(
        "outlier_count", ascending=False
    ).to_csv(out / "outlier_summary_iqr.csv", index=False)

    for col in LATENCY_COLUMNS:
        if col not in raw:
            continue
        values = pd.to_numeric(raw[col], errors="coerce").dropna()
        if values.empty:
            continue
        plt.figure(figsize=(8, 4.5))
        plt.hist(values, bins=50)
        plt.title(f"Distribution: {col}")
        plt.xlabel("Recorded value (verify units)")
        plt.ylabel("Monitoring rows")
        plt.tight_layout()
        plt.savefig(graphs / f"{col}_histogram.png", dpi=140)
        plt.close()

    if parsed_ts is not None:
        ts = raw.copy()
        ts[timestamp_col] = parsed_ts
        cols = [c for c in [
            "vllm_e2e_latency_p50_s", "vllm_e2e_latency_p95_s"
        ] if c in ts]
        ts = ts.dropna(subset=[timestamp_col]).sort_values(timestamp_col)
        if cols:
            plt.figure(figsize=(10, 4.5))
            for col in cols:
                plt.plot(ts[timestamp_col], ts[col], label=col, linewidth=0.8)
            plt.title("Recorded latency percentiles over time")
            plt.xlabel("Timestamp (UTC)")
            plt.ylabel("Recorded value (verify units)")
            plt.legend()
            plt.tight_layout()
            plt.savefig(graphs / "latency_time_series.png", dpi=140)
            plt.close()

    corr_cols = [c for c in CORRELATION_COLUMNS if c in raw]
    if len(corr_cols) >= 2:
        raw[corr_cols].corr(numeric_only=True).to_csv(out / "selected_metric_correlations.csv")
    if {"gpu_util_pct", "vllm_e2e_latency_p95_s"}.issubset(raw.columns):
        xy = raw[["gpu_util_pct", "vllm_e2e_latency_p95_s"]].apply(
            pd.to_numeric, errors="coerce"
        ).dropna()
        if not xy.empty:
            plt.figure(figsize=(8, 4.5))
            plt.scatter(xy["gpu_util_pct"], xy["vllm_e2e_latency_p95_s"], s=8, alpha=.35)
            plt.title("GPU utilization vs recorded vLLM E2E P95")
            plt.xlabel("GPU utilization (%)")
            plt.ylabel("Recorded value (verify units)")
            plt.tight_layout()
            plt.savefig(graphs / "gpu_vs_latency_p95.png", dpi=140)
            plt.close()

    start = str(parsed_ts.min()) if parsed_ts is not None and parsed_ts.notna().any() else "unavailable"
    end = str(parsed_ts.max()) if parsed_ts is not None and parsed_ts.notna().any() else "unavailable"
    missing_cells = int(raw.isna().sum().sum())
    total_cells = original_rows * original_cols
    report = f"""# Dataset Engineering and Statistical Analysis

## Dataset validation
- Input: `{source}`
- Rows: {original_rows:,}
- Columns: {original_cols}
- Timestamp range (UTC): {start} to {end}
- Missing cells: {missing_cells:,}/{total_cells:,} ({100 * missing_cells / total_cells:.3f}%)
- Fully duplicated rows: {duplicate_rows}
- Invalid/missing timestamps: {invalid_timestamps}
- Duplicate valid timestamps: {duplicate_timestamps}
- Negative numeric cells: {negative_numeric_cells}

## Data engineering decisions
- The source file is read-only; the script does not overwrite it.
- The cleaned export normalizes parseable `timestamp_utc` values to UTC ISO timestamps.
- Missing values are preserved; they are not filled with zero.
- Potential outliers are flagged with 1.5×IQR fences and are not automatically deleted.
- See `missing_values_by_column.csv`, `numeric_summary.csv`, and `outlier_summary_iqr.csv`.

## Interpretation and limitations
This dataset contains timestamped monitoring rows with aggregated latency percentiles (such as P50, P95 and P99), workload and hardware metrics. A row-level P95 is a percentile summary for its measurement interval, not the latency of one individual request. Percentiles across rows describe the distribution of those interval summaries; they do not reconstruct the underlying request-level latency distribution.

Column suffixes such as `_s` suggest seconds, but units and metric semantics must be confirmed against the dataset's source documentation before interpreting unusually large values. Plots therefore use "recorded value (verify units)".

Correlation results are exploratory and do not establish causation. Fitting an exponential distribution to an aggregate percentile column would model the aggregate metric across intervals, not individual request response times. Use raw per-request latency data for request-level exponential fitting and observed SLA compliance.

## Generated artifacts
- `cleaned_dataset.csv`
- `missing_values_by_column.csv`
- `numeric_summary.csv`
- `outlier_summary_iqr.csv`
- `selected_metric_correlations.csv` (when applicable)
- `graphs/*.png`
"""
    (out / "analysis_report.md").write_text(report, encoding="utf-8")
    print(json.dumps({
        "rows": original_rows, "columns": original_cols,
        "missing_cells": missing_cells, "duplicate_rows": duplicate_rows,
        "invalid_timestamps": invalid_timestamps, "output_directory": str(out.resolve())
    }, indent=2))

if __name__ == "__main__":
    main()
