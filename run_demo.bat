@echo off
TITLE ChainMind AI - Intelligent Supply Chain Copilot
echo =====================================================================
echo           ChainMind AI - Intelligent Supply Chain Copilot             
echo   Predictive ML, Google OR-Tools, Grounded RAG, & Agentic Decisioning 
echo =====================================================================
echo.

echo [1/3] Verifying Python Environment & Seeding Operational Database...
python -m backend.app.data.seed
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to seed database.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Launching FastAPI Backend on http://localhost:8000 ...
start "ChainMind AI Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

echo.
echo [3/3] Launching React Vite Frontend on http://localhost:5173 ...
cd frontend
start "ChainMind AI Frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo =====================================================================
echo   ChainMind AI is running!
echo   Web Interface:     http://localhost:5173
echo   Interactive Docs:  http://localhost:8000/docs
echo =====================================================================
timeout /t 3 >nul
start http://localhost:5173
