from pathlib import Path

import numpy as np
import pandas as pd
import plotly.express as px
import streamlit as st

DATA_PATH = Path(__file__).resolve().parent / "data" / "sofie.csv"


def render_historical_analysis():
    """Analyze historical vLLM monitoring snapshots."""

    st.header("Historical Dataset Analysis")
    st.caption(
        "Explore historical vLLM monitoring snapshots: latency, resource use, "
        "queue activity, snapshot statistics, and candidate distribution fits."
    )

    uploaded = st.file_uploader(
        "Upload sofie.csv (optional if the file is already in data/)",
        type=["csv"],
        key="historical_csv_upload",
    )

    try:
        if uploaded is not None:
            df = pd.read_csv(uploaded)
        elif DATA_PATH.exists():
            df = pd.read_csv(DATA_PATH)
        else:
            st.warning(
                "No dataset was found. Upload sofie.csv above, or place it at "
                "server-response-time-analyzer/data/sofie.csv."
            )
            return
    except Exception as exc:
        st.error(f"Could not read the dataset: {exc}")
        return

    required = [
        "timestamp_utc",
        "vllm_e2e_latency_p50_s",
        "vllm_e2e_latency_p95_s",
        "vllm_e2e_latency_p99_s",
    ]
    missing = [column for column in required if column not in df.columns]
    if missing:
        st.error(f"Required columns are missing: {', '.join(missing)}")
        return

    df["timestamp_utc"] = pd.to_datetime(
        df["timestamp_utc"], errors="coerce", utc=True
    )
    for column in df.columns:
        if column != "timestamp_utc":
            df[column] = pd.to_numeric(df[column], errors="coerce")

    df = df.dropna(subset=["timestamp_utc"]).sort_values("timestamp_utc")
    if df.empty:
        st.warning("No valid timestamps were found in this dataset.")
        return

    min_date = df["timestamp_utc"].min().date()
    max_date = df["timestamp_utc"].max().date()
    date_col1, date_col2 = st.columns(2)
    with date_col1:
        start_date = st.date_input(
            "Start date", value=min_date, min_value=min_date, max_value=max_date,
            key="historical_start_date",
        )
    with date_col2:
        end_date = st.date_input(
            "End date", value=max_date, min_value=min_date, max_value=max_date,
            key="historical_end_date",
        )

    if start_date > end_date:
        st.error("Start date must be on or before the end date.")
        return

    start_ts = pd.Timestamp(start_date, tz="UTC")
    end_ts = pd.Timestamp(end_date, tz="UTC") + pd.Timedelta(days=1)
    filtered = df[
        (df["timestamp_utc"] >= start_ts) & (df["timestamp_utc"] < end_ts)
    ].copy()
    if filtered.empty:
        st.warning("No records are available for the selected date range.")
        return

    st.subheader("Dataset Summary")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Monitoring records", f"{len(filtered):,}")
    c2.metric("Start (UTC)", filtered["timestamp_utc"].min().strftime("%d %b %Y"))
    c3.metric("End (UTC)", filtered["timestamp_utc"].max().strftime("%d %b %Y"))
    c4.metric("Columns", f"{filtered.shape[1]}")

    st.info(
        "This dataset contains periodic monitoring snapshots, not individual HTTP "
        "requests. The P50/P95/P99 columns are latency percentiles reported by the "
        "monitoring system at each timestamp. Statistics across rows describe "
        "snapshots, not raw request-level latency."
    )

    st.subheader("Historical End-to-End Latency")
    latency_columns = [
        "vllm_e2e_latency_p50_s",
        "vllm_e2e_latency_p95_s",
        "vllm_e2e_latency_p99_s",
    ]
    latency_long = filtered[["timestamp_utc"] + latency_columns].melt(
        id_vars="timestamp_utc",
        var_name="Latency metric",
        value_name="Latency (seconds)",
    ).dropna()
    fig = px.line(
        latency_long,
        x="timestamp_utc",
        y="Latency (seconds)",
        color="Latency metric",
        title="vLLM End-to-End Latency Over Time",
    )
    fig.update_layout(hovermode="x unified")
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("CPU, RAM, and GPU Utilization")
    resource_columns = [
        col for col in ["node_cpu_used_pct", "node_ram_used_pct", "gpu_util_pct"]
        if col in filtered.columns
    ]
    if resource_columns:
        resource_long = filtered[["timestamp_utc"] + resource_columns].melt(
            id_vars="timestamp_utc",
            var_name="Resource",
            value_name="Utilization (%)",
        ).dropna()
        resource_fig = px.line(
            resource_long,
            x="timestamp_utc",
            y="Utilization (%)",
            color="Resource",
            title="Resource Utilization Over Time",
        )
        st.plotly_chart(resource_fig, use_container_width=True)

    st.subheader("Queue and Request Activity")
    queue_columns = [
        col for col in [
            "vllm_queue_time_p50_s", "vllm_waiting", "vllm_running",
            "vllm_requests_per_s",
        ] if col in filtered.columns
    ]
    if queue_columns:
        selected_queue = st.selectbox(
            "Choose a queue/request metric",
            queue_columns,
            key="historical_queue_metric",
        )
        queue_fig = px.line(
            filtered,
            x="timestamp_utc",
            y=selected_queue,
            title=f"{selected_queue} Over Time",
        )
        st.plotly_chart(queue_fig, use_container_width=True)

    st.subheader("Latency Snapshot Statistics")
    latency_options = [
        col for col in [
            "vllm_e2e_latency_p50_s", "vllm_e2e_latency_p95_s",
            "vllm_e2e_latency_p99_s", "gateway_latency_p50_s",
            "gateway_latency_p95_s", "gateway_latency_p99_s",
        ] if col in filtered.columns
    ]
    metric = st.selectbox(
        "Choose a latency metric",
        latency_options,
        key="historical_latency_metric",
    )
    values = filtered[metric].dropna()
    values = values[np.isfinite(values) & (values >= 0)]
    if values.empty:
        st.warning("No valid non-negative values are available for this metric.")
        return

    s1, s2, s3, s4 = st.columns(4)
    s1.metric("Mean", f"{values.mean():.4f} s")
    s2.metric("Median", f"{values.median():.4f} s")
    s3.metric("Snapshot P95", f"{values.quantile(0.95):.4f} s")
    s4.metric("Snapshot P99", f"{values.quantile(0.99):.4f} s")

    stats = pd.DataFrame({
        "Statistic": [
            "Count", "Mean (s)", "Variance (s²)", "Standard deviation (s)",
            "Minimum (s)", "Maximum (s)",
        ],
        "Value": [
            int(values.count()), values.mean(), values.var(), values.std(),
            values.min(), values.max(),
        ],
    })
    st.dataframe(stats, hide_index=True, use_container_width=True)

    hist_fig = px.histogram(
        x=values,
        nbins=50,
        labels={"x": f"{metric} (seconds)", "count": "Snapshot count"},
        title=f"Distribution of {metric} Across Snapshots",
    )
    st.plotly_chart(hist_fig, use_container_width=True)

    st.subheader("Exponential vs Lognormal Fit")
    st.caption(
        "AIC compares candidate fits for the selected snapshot-level metric; "
        "it does not prove that either model describes individual requests."
    )
    positive = values[values > 0].to_numpy(dtype=float)
    if len(positive) < 10:
        st.info("At least 10 positive observations are recommended for model comparison.")
    else:
        try:
            from scipy import stats as scipy_stats

            exp_scale = positive.mean()
            exp_ll = np.sum(scipy_stats.expon.logpdf(positive, scale=exp_scale))
            exp_aic = 2 * 1 - 2 * exp_ll

            log_shape, _, log_scale = scipy_stats.lognorm.fit(positive, floc=0)
            log_ll = np.sum(
                scipy_stats.lognorm.logpdf(
                    positive, s=log_shape, loc=0, scale=log_scale
                )
            )
            log_aic = 2 * 2 - 2 * log_ll

            f1, f2 = st.columns(2)
            f1.metric("Exponential AIC", f"{exp_aic:.2f}")
            f2.metric("Lognormal AIC", f"{log_aic:.2f}")
            if exp_aic < log_aic:
                st.success("The exponential fit has the lower AIC for this selection.")
            elif log_aic < exp_aic:
                st.success("The lognormal fit has the lower AIC for this selection.")
            else:
                st.info("Both models have the same AIC to the displayed precision.")
            st.caption(
                "Lower AIC indicates a better relative fit among these two models. "
                "Autocorrelation and aggregation in monitoring snapshots limit interpretation."
            )
        except Exception as exc:
            st.warning(f"Could not complete the distribution comparison: {exc}")

    st.subheader("Export Selected Records")
    st.download_button(
        "Download filtered CSV",
        data=filtered.to_csv(index=False).encode("utf-8"),
        file_name="sofie_filtered.csv",
        mime="text/csv",
    )
