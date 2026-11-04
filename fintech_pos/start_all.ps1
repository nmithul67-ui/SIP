# FinOS POS - Single Command Launch Script
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Starting FinOS Resilient Enterprise POS  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend in background window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; python -m uvicorn backend.main:app --reload --port 8000"

# 2. Start Production POS Web App in background window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npx serve dist -l 3000"

# 3. Start Expo Web Dev Server in background window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npx expo start --web --port 8082"

Write-Host "`nAll servers started successfully!" -ForegroundColor Green
Write-Host "  • POS Production Web App : http://localhost:3000" -ForegroundColor Yellow
Write-Host "  • CA Web Audit Portal    : http://localhost:8000/ca-portal" -ForegroundColor Yellow
Write-Host "  • Backend Swagger Docs   : http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "  • Expo Dev Server        : http://localhost:8082`n" -ForegroundColor Yellow
