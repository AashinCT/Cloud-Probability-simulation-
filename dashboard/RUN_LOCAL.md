# Run the local response-time dashboard

## Windows quick start
Double-click `RUN_LOCAL.bat` in this folder. It installs the API dependencies into a local virtual environment, starts the FastAPI API and static dashboard, then opens the dashboard.

- Dashboard: http://127.0.0.1:8080
- API health: http://127.0.0.1:8000/health
- API documentation: http://127.0.0.1:8000/docs

Keep the API and dashboard terminal windows open. The dashboard calls `/api/probe` on each refresh; the backend records actual HTTP request latency and CPU/RAM snapshots. Up to 1,000 records are held in memory and reset when the API process restarts.

## Manual start
From the repository root, run in terminal 1:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r dashboard\requirements-api.txt
python -m uvicorn dashboard.backend:app --host 127.0.0.1 --port 8000
```

In terminal 2:

```powershell
cd dashboard
python -m http.server 8080 --bind 127.0.0.1
```

Then open http://127.0.0.1:8080.

## GitHub Pages limitation
GitHub Pages only serves static files; it does not run Python/FastAPI. Also, a hosted HTTPS page cannot call an HTTP localhost API in a visitor's browser. Use the local dashboard URL for the complete local demo. To provide public live monitoring, deploy the FastAPI backend to an HTTPS host and open the dashboard with `?api=https://YOUR-BACKEND-HOST`.

## Separate Streamlit simulation
The older Streamlit app under `server-response-time-analyzer\app.py` is a separate simulation/statistics interface. It is not the API backend for the static dashboard.
