@echo off
setlocal
cd /d "%~dp0"
py -3.12 -m venv backend\venv-review
if errorlevel 1 (
  echo Install Python 3.12 with the py launcher, then run this script again.
  exit /b 1
)
backend\venv-review\Scripts\python.exe -m pip install -r backend\requirements.txt -r backend\requirements-dev.txt
if errorlevel 1 exit /b 1
echo Backend ready. Run dev.bat to start the application.
