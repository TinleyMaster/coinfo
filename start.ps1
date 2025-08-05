# CoinInfo 项目启动脚本
Write-Host "正在启动 CoinInfo 项目..." -ForegroundColor Green
Write-Host ""

# 检查 Node.js 是否安装
try {
    $nodeVersion = node --version
    Write-Host "Node.js 版本: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "错误: 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    exit 1
}

# 启动后端
Write-Host "启动后端服务..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; npm install; npm start" -WindowStyle Normal

# 等待3秒
Write-Host "等待3秒后启动前端..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 启动前端
Write-Host "启动前端服务..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm install; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "项目启动完成！" -ForegroundColor Green
Write-Host "后端: http://localhost:5000" -ForegroundColor Cyan
Write-Host "前端: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")