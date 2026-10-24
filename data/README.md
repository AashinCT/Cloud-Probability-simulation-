# Historical vLLM Monitoring Dataset

Place the provided `sofie.csv` file in this directory as `data/sofie.csv` when adding the source dataset locally.

## Dataset notes

- Contains monitoring snapshots for a vLLM inference server, rather than one row per individual HTTP request.
- `timestamp_utc`: snapshot timestamp in UTC.
- `vllm_e2e_latency_p50_s`, `vllm_e2e_latency_p95_s`, `vllm_e2e_latency_p99_s`: aggregated latency percentiles in seconds.
- `vllm_queue_time_p50_s`: median queue-time metric recorded for a snapshot.
- `vllm_running`, `vllm_waiting`: running and waiting request counts.
- `gpu_util_pct`, `node_cpu_used_pct`, `node_ram_used_pct`: recorded resource metrics.

## Important

Do not merge these aggregated latency snapshots with the project's live HTTP request measurements as if they were the same data type. Keep historical vLLM metrics separate from the live collector.

The source file has not been committed by this documentation-only change. Add `sofie.csv` here only if you have permission to redistribute it and it contains no sensitive infrastructure information.
