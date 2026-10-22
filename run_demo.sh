#!/bin/bash
echo "====================================================================="
echo "          ChainMind AI - Intelligent Supply Chain Copilot             "
echo "  Predictive ML, Google OR-Tools, Grounded RAG, & Agentic Decisioning "
echo "====================================================================="
echo ""

echo "[1/3] Seeding Operational Database..."
python3 -m backend.app.data.seed

echo ""
echo "[2/3] Launching FastAPI Backend on http://localhost:8000 ..."
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo ""
echo "[3/3] Launching React Vite Frontend on http://localhost:5173 ..."
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!

echo ""
echo "====================================================================="
echo "  ChainMind AI is running!"
echo "  Web Interface:     http://localhost:5173"
echo "  Interactive Docs:  http://localhost:8000/docs"
echo "====================================================================="

wait $BACKEND_PID $FRONTEND_PID
