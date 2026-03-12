@echo off
REM EduMind Quick Start — Windows
REM Usage: Double-click start.bat or run from Command Prompt

echo.
echo ==========================================
echo    EduMind AI Study Assistant
echo    Quick Start (Windows)
echo ==========================================
echo.

REM Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Install from https://python.org
    pause
    exit /b 1
)

echo Found: %python_ver%

REM Create .env if missing
if not exist ".env" (
    copy .env.example .env
    echo.
    echo  .env file created. Please edit it and add your OPENAI_API_KEY
    echo  then run this script again.
    echo.
    pause
    exit /b 1
)

REM Create venv if missing
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt -q

REM Create runtime directories
if not exist "data\" mkdir data
if not exist "uploads\" mkdir uploads
if not exist "study_db\" mkdir study_db

echo.
echo  Starting EduMind on http://localhost:5000
echo  Press Ctrl+C to stop
echo.

python backend\app.py

pause
