@echo off
title SCGRS Launcher
echo ========================================================
echo   Smart Campus Grievance Redressal System (SCGRS)
echo ========================================================
echo.
echo Starting all 3 services in separate windows...
echo.

:: 1. Start Python AI Service
start "SCGRS - AI Service (Port 5000)" cmd /k "cd ai-service && (if exist venv\Scripts\activate.bat call venv\Scripts\activate.bat) && python app.py"

:: 2. Start Backend Server
start "SCGRS - Backend Server (Port 5001)" cmd /k "cd backend && npm install && npm start"

:: 3. Start Frontend Development Server
start "SCGRS - Frontend (Port 5173)" cmd /k "cd frontend && npm install && npm run dev"

echo All services launched!
echo.
echo Frontend will be running at: http://localhost:5173
echo Backend API running at:     http://127.0.0.1:5001
echo AI Service running at:      http://127.0.0.1:5000
echo.
echo You can close this window.
pause
