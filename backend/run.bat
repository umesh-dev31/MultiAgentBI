@echo off
setlocal
set PYTHONUTF8=1
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"
set "INSIGHT_PYTHON=venv-review\Scripts\python.exe"
if not exist "%INSIGHT_PYTHON%" set "INSIGHT_PYTHON=venv\Scripts\python.exe"
if not exist "%INSIGHT_PYTHON%" (
  echo Backend environment missing. Run setup_backend.bat first.
  exit /b 1
)
"%INSIGHT_PYTHON%" -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
