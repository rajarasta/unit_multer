@echo off
echo 🤖 Starting Excel AI Agent FastAPI Backend
echo ==========================================
echo.
echo Installing dependencies...
pip install fastapi==0.104.1 uvicorn==0.24.0 openpyxl==3.1.2 pydantic==2.5.0 python-multipart==0.0.6
echo.
echo Starting server on port 3005...
cd backend
python excel_executor.py
pause