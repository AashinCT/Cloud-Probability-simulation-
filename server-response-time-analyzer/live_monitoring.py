"""On-demand live HTTP endpoint monitoring for the Streamlit analyzer."""

from datetime import datetime, timezone
from time import perf_counter, sleep
from urllib.parse import urlparse

import pandas as pd
import plotly.express as px
import requests
import streamlit as st


def _validate_url(raw_url: str) -> str:
    """Validate the URL shape before making an outbound request."""
    url = raw_url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Enter a complete URL beginning with http:// or https://.")
    if parsed.username or parsed.password:
        raise ValueError("URLs containing embedded credentials are not supported.")
    return url


def _probe(url: str, timeout_seconds: float) -> dict:
    """Make one request and record latency/status, including HTTP error statuses."""
    started = perf_counter()
    timestamp = datetime.now(timezone.utc).isoformat()
    try:
        response = requests.get(
            url,
            timeout=timeout_seconds,
            headers={"User-Agent": "ServerResponseTimeAnalyzer/1.0"},
        )
        elapsed = perf_counter() - started
        return {
            "timestamp_utc": timestamp,
            "endpoint": url,
            "latency_ms": round(elapsed * 1000, 3),
            "status_code": int(response.status_code),
            "success": 200 <= response.status_code < 400,
            "error": "",
        }
    except requests.RequestException as exc:
        elapsed = perf_counter() - started
        return {
            "timestamp_utc": timestamp,
            "endpoint": url,
            "latency_ms": round(elapsed * 1000, 3),
            "status_code": None,
            "success": False,
            "error": str(exc)[:240],
        }


def render_live_monitoring() -> None:
    """Render an explicitly user-triggered HTTP endpoint probe dashboard."""
    st.header("Live API Monitoring")
    st.caption(
        "Measure real HTTP response times for an endpoint you control or are "
        "authorized to test. Probes run only when you click the button."
    )

    with st.form("live_probe_form"):
        endpoint = st.text_input(
            "HTTP endpoint URL",
            value="https://httpbin.org/get",
            help="Use a health-check endpoint when available. Only probe systems you own or have permission to test.",
        )
        col1, col2, col3 = st.columns(3)
        with col1:
            probe_count = st.number_input(
                "Number of probes", min_value=1, max_value=20, value=5, step=1
            )
        with col2:
            timeout_seconds = st.number_input(
                "Timeout (seconds)", min_value=1.0, max_value=30.0,
                value=5.0, step=1.0,
            )
        with col3:
            interval_seconds = st.number_input(
                "Delay between probes (seconds)", min_value=0.0,
                max_value=2.0, value=0.2, step=0.1,
            )
        run_probes = st.form_submit_button("▶ Run live probes", type="primary")

    if run_probes:
        try:
            url = _validate_url(endpoint)
        except ValueError as exc:
            st.error(str(exc))
            return

        rows = []
        progress = st.progress(0, text="Starting endpoint checks...")
        for index in range(int(probe_count)):
            rows.append(_probe(url, float(timeout_seconds)))
            progress.progress(
                (index + 1) / int(probe_count),
                text=f"Completed probe {index + 1} of {int(probe_count)}",
            )
            if index + 1 < int(probe_count) and interval_seconds > 0:
                sleep(float(interval_seconds))
        progress.empty()
        st.session_state["live_probe_results"] = rows
        st.session_state["live_probe_endpoint"] = url
        st.session_state["live_probe_batch_id"] = datetime.now(timezone.utc).isoformat(timespec="microseconds")

    rows = st.session_state.get("live_probe_results", [])
    if not rows:
        st.info("Run a probe to collect real response-time measurements.")
        st.markdown(
            "**What this measures:** client-observed HTTP round-trip latency, "
            "HTTP status, timestamp, and request failures. It does not inspect "
            "the target server's internal CPU or RAM unless the target exposes "
            "those metrics through a separate endpoint."
        )
        return

    results = pd.DataFrame(rows)
    numeric_latency = pd.to_numeric(results["latency_ms"], errors="coerce")
    successful = results["success"].astype(bool)
    total = len(results)
    success_rate = successful.mean() * 100
    valid_latency = numeric_latency.dropna()

    st.subheader("Latency Anomaly Detection")
    sensitivity = st.slider(
        "Anomaly sensitivity (robust MAD multiplier)",
        min_value=1.5,
        max_value=5.0,
        value=3.0,
        step=0.5,
        help="Lower values flag more unusual latency spikes. This is a heuristic, not a trained model.",
    )
    median_latency = valid_latency.median() if not valid_latency.empty else None
    if len(valid_latency) >= 5:
        mad = (valid_latency - median_latency).abs().median()
        robust_sigma = 1.4826 * mad
        # Avoid a zero-width threshold when most samples have identical timings.
        minimum_margin = max(float(median_latency) * 0.5, 1.0)
        latency_threshold = float(median_latency) + max(
            float(sensitivity) * robust_sigma, minimum_margin
        )
        results["latency_anomaly"] = numeric_latency > latency_threshold
        results["anomaly_reason"] = ""
        results.loc[results["latency_anomaly"], "anomaly_reason"] = (
            "Latency spike above robust threshold"
        )
        results.loc[~successful, "latency_anomaly"] = True
        results.loc[~successful, "anomaly_reason"] = "HTTP failure or request error"
        st.caption(
            f"Robust latency threshold: {latency_threshold:.2f} ms "
            f"(median {median_latency:.2f} ms). Failed requests are always flagged."
        )
    else:
        results["latency_anomaly"] = ~successful
        results["anomaly_reason"] = ""
        results.loc[~successful, "anomaly_reason"] = "HTTP failure or request error"
        st.info(
            "Collect at least 5 probes for latency-spike detection. "
            "HTTP/request failures are still flagged with smaller samples."
        )

    # Retain run history in this Streamlit session; no persistent file/database writes.
    if run_probes:
        history = st.session_state.get("live_probe_history", [])
        batch_id = st.session_state.get("live_probe_batch_id", datetime.now(timezone.utc).isoformat())
        batch_median = float(valid_latency.median()) if not valid_latency.empty else None
        history_rows = results.copy()
        history_rows["batch_id"] = batch_id
        history_rows["probe_number"] = range(1, len(history_rows) + 1)
        history_rows["batch_median_ms"] = batch_median
        history.extend(history_rows.to_dict(orient="records"))
        st.session_state["live_probe_history"] = history

    anomaly_count = int(results["latency_anomaly"].fillna(False).sum())
    if anomaly_count:
        st.warning(
            f"⚠️ {anomaly_count} anomalous probe(s) detected out of {total}. "
            "Review the probe details and rerun to see whether the issue persists."
        )
    else:
        st.success("No anomalies detected in this probe batch.")

    st.subheader("Latest Probe Summary")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Probes", f"{total}")
    c2.metric("Successful HTTP responses", f"{int(successful.sum())}/{total}")
    c3.metric("Success rate", f"{success_rate:.1f}%")
    c4.metric("Mean latency", f"{valid_latency.mean():.2f} ms" if not valid_latency.empty else "—")

    if not valid_latency.empty:
        p95 = valid_latency.quantile(0.95)
        p99 = valid_latency.quantile(0.99)
        c1, c2, c3 = st.columns(3)
        c1.metric("P50 latency", f"{valid_latency.quantile(0.50):.2f} ms")
        c2.metric("P95 latency", f"{p95:.2f} ms")
        c3.metric("P99 latency", f"{p99:.2f} ms")
        chart_data = results.copy()
        chart_data["probe_number"] = range(1, len(chart_data) + 1)
        fig = px.line(
            chart_data,
            x="probe_number",
            y="latency_ms",
            markers=True,
            color="latency_anomaly",
            title="Observed HTTP latency by probe (anomalies highlighted)",
            labels={"probe_number": "Probe", "latency_ms": "Round-trip latency (ms)"},
        )
        st.plotly_chart(fig, use_container_width=True)

    display = results.copy()
    display["timestamp_utc"] = pd.to_datetime(
        display["timestamp_utc"], utc=True
    ).dt.strftime("%Y-%m-%d %H:%M:%S UTC")
    st.subheader("Probe Details")
    st.dataframe(display, hide_index=True, use_container_width=True)
    st.download_button(
        "Download probe results (CSV)",
        data=results.to_csv(index=False).encode("utf-8"),
        file_name="live_endpoint_probes.csv",
        mime="text/csv",
    )
    st.caption(
        "Anomaly detection uses a median/MAD-based heuristic and always flags failed requests; it is a triage aid, not proof of an incident. P50/P95/P99 are calculated from this run's individual probe latencies. "
        "For a small number of probes, especially fewer than 20, tail percentiles "
        "are indicative only. This is on-demand probing, not a persistent background monitor."
    )

    st.divider()
    st.subheader("Run History and Trend Comparison")
    history = st.session_state.get("live_probe_history", [])
    if not history:
        st.info("History will appear after the next probe batch.")
        return

    history_df = pd.DataFrame(history)
    history_df["latency_ms"] = pd.to_numeric(history_df["latency_ms"], errors="coerce")
    history_df["success"] = history_df["success"].astype(bool)
    history_df["latency_anomaly"] = history_df["latency_anomaly"].fillna(False).astype(bool)
    history_df["batch_time"] = pd.to_datetime(history_df["batch_id"], utc=True, errors="coerce")
    batch_summary = (
        history_df.groupby(["endpoint", "batch_id", "batch_time"], dropna=False)
        .agg(
            probes=("latency_ms", "size"),
            median_latency_ms=("latency_ms", "median"),
            mean_latency_ms=("latency_ms", "mean"),
            success_rate_pct=("success", lambda values: values.mean() * 100),
            anomalies=("latency_anomaly", "sum"),
        )
        .reset_index()
        .sort_values("batch_time")
    )
    endpoint_options = batch_summary["endpoint"].dropna().drop_duplicates().tolist()
    selected_endpoint = st.selectbox(
        "Endpoint trend", endpoint_options, index=max(0, len(endpoint_options) - 1)
    )
    endpoint_batches = batch_summary[batch_summary["endpoint"] == selected_endpoint].copy()
    endpoint_batches["run_number"] = range(1, len(endpoint_batches) + 1)
    if len(endpoint_batches) >= 2:
        previous_median = endpoint_batches.iloc[-2]["median_latency_ms"]
        current_median = endpoint_batches.iloc[-1]["median_latency_ms"]
        if pd.notna(previous_median) and pd.notna(current_median):
            delta_pct = ((current_median - previous_median) / previous_median * 100) if previous_median else None
            if delta_pct is not None:
                st.metric(
                    "Latest batch median vs previous batch",
                    f"{current_median:.2f} ms",
                    delta=f"{delta_pct:+.1f}% vs previous median",
                    delta_color="inverse",
                )
    if endpoint_batches["median_latency_ms"].notna().any():
        trend_fig = px.line(
            endpoint_batches,
            x="run_number",
            y="median_latency_ms",
            markers=True,
            title="Median latency across probe batches",
            labels={"run_number": "Probe batch (oldest to newest)", "median_latency_ms": "Median latency (ms)"},
            hover_data={"batch_id": True, "success_rate_pct": ":.1f", "anomalies": True},
        )
        st.plotly_chart(trend_fig, use_container_width=True)
    st.dataframe(
        endpoint_batches[["batch_id", "probes", "median_latency_ms", "mean_latency_ms", "success_rate_pct", "anomalies"]],
        hide_index=True,
        use_container_width=True,
    )
    st.download_button(
        "Download session history (CSV)",
        data=history_df.to_csv(index=False).encode("utf-8"),
        file_name="live_probe_session_history.csv",
        mime="text/csv",
        key="download_live_probe_history",
    )
    st.caption(
        "History is retained only in this Streamlit browser session and may reset when the session/server restarts. "
        "It is not written to a database or shared between users. Trend changes are descriptive signals, not proof of causation."
    )
