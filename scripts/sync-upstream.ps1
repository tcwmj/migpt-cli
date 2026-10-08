# 与上游仓库同步：fetch + rebase
# Usage: powershell -ExecutionPolicy Bypass -File scripts\sync-upstream.ps1

$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { $PWD.Path }
$root = if ($scriptDir -and (Test-Path "$scriptDir\..\package.json")) { Split-Path -Parent $scriptDir } else { $PWD.Path }

Write-Host "== 同步上游仓库 ==" -ForegroundColor Cyan

# 1. 获取上游最新变更
Write-Host "正在获取上游变更..." -ForegroundColor Yellow
git -C $root fetch upstream
if ($LASTEXITCODE -ne 0) {
    Write-Host "获取上游变更失败，请检查 upstream 远程配置" -ForegroundColor Red
    exit 1
}

# 2. 检查当前分支
$currentBranch = git -C $root branch --show-current
Write-Host "当前分支: $currentBranch" -ForegroundColor Green

# 3. 合并上游 main 到当前分支
Write-Host "正在合并 upstream/main 到 $currentBranch..." -ForegroundColor Yellow
git -C $root merge upstream/main --no-edit
if ($LASTEXITCODE -ne 0) {
    Write-Host "合并存在冲突，请手动解决后执行: git merge --continue" -ForegroundColor Red
    exit 1
}

Write-Host "同步完成！" -ForegroundColor Green