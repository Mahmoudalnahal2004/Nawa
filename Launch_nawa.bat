@echo off
title Nawa Q-Bank Starter

:: Launch the Backend (FastAPI)
echo Starting Backend...
start cmd /k "cd /d D:\@Nawa Questionbank\apps\api && .\venv\Scripts\activate && py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: Launch the Frontend (Next.js)
echo Starting Frontend...
start cmd /k "cd /d D:\@Nawa Questionbank\apps\web && npm run dev -- -p 3200"

echo.
echo Nawa Q-Bank is launching! 
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3200
pause