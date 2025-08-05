@echo off
echo 正在启动 CoinInfo 项目...
echo.

echo 启动后端服务...
start "Backend" cmd /k "cd /d backend && npm install && npm start"

echo 等待3秒后启动前端...
timeout /t 3 /nobreak >nul

echo 启动前端服务...
start "Frontend" cmd /k "cd /d frontend && npm install && npm start"

echo.
echo 项目启动完成！
echo 后端: http://localhost:5000
echo 前端: http://localhost:3000
echo.
pause