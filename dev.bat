@echo off
echo Starting AgentInsight AI...
start "AgentInsight - Backend" /min cmd /k ""%~dp0run_backend.bat""
start "AgentInsight - Frontend" /min cmd /k "cd /d "%~dp0frontend" && npm run dev"
echo Backend running on http://127.0.0.1:8000
echo Frontend running on http://localhost:5173
