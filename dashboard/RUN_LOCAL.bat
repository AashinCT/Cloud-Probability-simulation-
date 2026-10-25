@echo off
setlocal
set "ROOT=%~dp0.."
for %%I in ("%ROOT%") do set "ROOT=%%~fI"
where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found. Install Python 3.11 or newer and enable Add Python to PATH.
  pause
  exit /b 1
)
if not exist "%ROOT%\.venv\Scripts\python.exe" python -m venv "%ROOT%\.venv"
"%ROOT%\.venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :error
"%ROOT%\.venv\Scripts\python.exe" -m pip install -r "%ROOT%\dashboard\requirements-api.txt"
if errorlevel 1 goto :error
start "Response Monitor API" /D "%ROOT%" "%ROOT%\.venv\Scripts\python.exe" -m uvicorn dashboard.backend:app --host 127.0.0.1 --port 8000
timeout /t 2 /nobreak >nul
start "Response Monitor Dashboard" /D "%ROOT%\dashboard" python -m http.server 8080 --bind 127.0.0.1
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8080"
echo.
echo Dashboard: http://127.0.0.1:8080
echo API health: http://127.0.0.1:8000/health
echo Keep both terminal windows open while using the dashboard.
pause
exit /b 0
:error
echo Setup failed. Read the error above, then try again.
pause
exit /b 1
