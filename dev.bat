@echo off
echo Starting AgentInsight AI...
start "AgentInsight - Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
start "AgentInsight - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Backend running on http://127.0.0.1:8000
echo Frontend running on http://localhost:5173
