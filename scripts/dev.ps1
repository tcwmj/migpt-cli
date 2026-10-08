# MiGPT local dev hot-start
# Frontend: webpack --watch auto-compile (browser F5, no restart needed)
# Backend : tsc -w auto-compile + node --watch auto-restart (no manual restart)
# Usage   : powershell -ExecutionPolicy Bypass -File scripts\dev.ps1

$root = "D:\Workspace\migpt-cli"
$log  = Join-Path $root ".cache\logs"
New-Item -ItemType Directory -Force -Path $log | Out-Null

Write-Host "== MiGPT dev hot-start ==" -ForegroundColor Cyan

# 1. stop old migpt service on 36597
$old = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
       Where-Object { $_.CommandLine -match 'migpt' -and $_.CommandLine -match '36597' }
foreach ($p in $old) {
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
    Write-Host ("stopped old PID " + $p.ProcessId) -ForegroundColor Yellow
}
Start-Sleep -Seconds 1

# node.exe full path (dynamic with fallback)
$nodeExe = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $nodeExe) {
    $nodeExe = "C:\Users\TCWMJ\AppData\Local\DoubaoWork\User Data\sandbox_runtime\bases\c98c5042338ed152c6f10ecd8591889f\node\node.exe"
}

# 2. frontend watch: packages/gui -> dist
Start-Process -FilePath $nodeExe -WindowStyle Hidden -WorkingDirectory "$root\packages\gui" `
    -ArgumentList @("$root\node_modules\webpack\bin\webpack.js", '--watch', '--env', 'mode=development') `
    -RedirectStandardOutput "$log\gui-watch.log" -RedirectStandardError "$log\gui-watch.err.log"
Write-Host "frontend watch started -> packages\gui\dist (F5 in browser after edit)" -ForegroundColor Green

# 3. backend tsc watch: packages/server -> dist
Start-Process -FilePath $nodeExe -WindowStyle Hidden -WorkingDirectory "$root\packages\server" `
    -ArgumentList @("$root\node_modules\typescript\bin\tsc", '-d', '-w') `
    -RedirectStandardOutput "$log\server-tsc.log" -RedirectStandardError "$log\server-tsc.err.log"
Write-Host "backend tsc watch started" -ForegroundColor Green

# 4. backend process: node --watch auto-restart (port 36597)
Start-Process -FilePath $nodeExe -WindowStyle Hidden -WorkingDirectory $root `
    -ArgumentList @('--watch-path', "$root\packages\server\dist", "$root\apps\server\dist\index.js", '--port', '36597') `
    -RedirectStandardOutput "$log\server-run.log" -RedirectStandardError "$log\server-run.err.log"
Write-Host "backend node --watch started -> http://127.0.0.1:36597" -ForegroundColor Green

Start-Sleep -Seconds 6
try {
    $r = Invoke-WebRequest "http://127.0.0.1:36597/" -UseBasicParsing -TimeoutSec 6
    Write-Host ("HTTP " + $r.StatusCode + " ready") -ForegroundColor Cyan
} catch {
    Write-Host "not ready yet, check logs: $log" -ForegroundColor Red
}

Write-Host "logs: $log"
Write-Host "stop dev: taskkill /F /IM node.exe"
