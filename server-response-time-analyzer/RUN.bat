@echo off
REM Server Response Time Analyzer - Easy Run Script

echo ========================================================
echo  Server Response Time Analyzer - Starting
echo ========================================================
echo.

REM Navigate to the project directory
cd /d "c:\Users\Aashin C\Cloud-Probability-simulation-\server-response-time-analyzer"

echo Current directory: %cd%
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo.
    echo Please install Python from: https://www.python.org
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo Python found: 
python --version
echo.

REM Check if venv exists, if not create it
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
    echo Virtual environment created successfully!
    echo.
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)
echo Virtual environment activated!
echo.

REM Install requirements
echo Installing required packages...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install requirements
    pause
    exit /b 1
)
echo Packages installed successfully!
echo.

REM Run the Streamlit app
echo ========================================================
echo Starting Streamlit Dashboard...
echo ========================================================
echo.
echo The app will open in your browser at: http://localhost:8501
echo.
echo Press Ctrl+C to stop the app
echo.

streamlit run app.py

pause
