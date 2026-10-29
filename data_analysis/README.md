# Monitoring Dataset: Data Engineering and Statistical Analysis

This folder adds a reproducible Python analysis pipeline for the vLLM/gateway monitoring CSV. It is intentionally separate from the live HTTP collector and its request-level measurements.

## Run locally

1. Keep the supplied CSV in a local folder, for example `data/sofie.csv`. Do not overwrite the source.
2. Install dependencies:

```bash
python -m pip install -r requirements-data-analysis.txt
```

3. Run:

```bash
python data_analysis/run_analysis.py data/sofie.csv --out data_analysis/outputs
```

The output folder contains a timestamp-normalized cleaned CSV, missing-value counts, numeric summaries, IQR outlier screening, exploratory correlations, graphs, and a Markdown report.

## Data engineering policy

- Original input remains unchanged.
- Missing values are preserved, not converted to zero.
- Outliers are flagged, not automatically deleted.
- Timestamp parsing uses UTC.
- Data quality counts are reported for transparency.

## Statistical interpretation

This CSV contains monitoring interval rows with aggregated latency percentiles (P50/P95/P99), not one row per HTTP request. Percentiles calculated across rows summarize the distribution of interval-level metrics and cannot be treated as the latency distribution of all underlying requests.

The `_s` suffix suggests seconds, but verify units and metric definitions from the original dataset documentation before interpreting extreme values. Correlations are exploratory, not causal. Do not fit a request-level exponential model or claim request-level SLA compliance from these aggregate percentiles.

## Keep datasets separate

Do not merge this monitoring CSV into `response_times.txt` or the live collector's combined file. They have different granularities and meanings.
