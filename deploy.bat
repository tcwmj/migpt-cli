@echo off
REM migpt-cli 一键部署脚本 (Windows)
REM 用法：deploy.bat

setlocal enabledelayedexpansion

echo ========================================
echo   migpt-cli Docker 部署脚本
echo ========================================

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo 错误：Docker 未安装，请先安装 Docker
    pause
    exit /b 1
)

REM 检查 Docker Compose 是否安装
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo 错误：Docker Compose 未安装，请先安装 Docker Compose
        pause
        exit /b 1
    )
)

REM 创建 .env 文件（如果不存在）
if not exist .env (
    echo 未找到 .env 文件，正在从模板创建...
    copy .env.example .env
    echo 已创建 .env 文件，请编辑配置后重新运行此脚本
    echo 配置文件位置：%cd%\.env
    pause
    exit /b 0
)

REM 加载环境变量
for /f "tokens=1,* delims==" %%a in (.env) do (
    set "%%a=%%b"
)

REM 检查必要配置
if "%AUTH_PASSWORD%"=="" (
    echo 错误：请在 .env 文件中设置 AUTH_PASSWORD
    pause
    exit /b 1
)

if "%AUTH_PASSWORD%"=="your_secure_password_here" (
    echo 错误：请在 .env 文件中设置 AUTH_PASSWORD
    pause
    exit /b 1
)

REM 选择部署模式
echo.
echo 请选择部署模式：
echo 1) 拉取预构建镜像（推荐，速度快）
echo 2) 本地构建镜像（适合开发调试）
set /p DEPLOY_MODE="请输入选项 [1]: "
if "%DEPLOY_MODE%"=="" set DEPLOY_MODE=1

if "%DEPLOY_MODE%"=="2" (
    echo 使用本地构建模式...

    REM 更新 docker-compose.yml 启用本地构建
    powershell -Command "(Get-Content docker-compose.yml) -replace '# build:', 'build:' -replace '#   context: .', '  context: .' -replace '#   dockerfile: Dockerfile', '  dockerfile: Dockerfile' -replace '#   args:', '  args:' -replace '#     VERSION: ${VERSION:-dev}', '    VERSION: ${VERSION:-dev}' -replace '#     REVISION: ${REVISION:-unknown}', '    REVISION: ${REVISION:-unknown}' | Set-Content docker-compose.yml"

    REM 注释掉 image 行
    powershell -Command "(Get-Content docker-compose.yml) -replace '    image:', '#    image:' | Set-Content docker-compose.yml"

    REM 启动构建
    docker-compose up --build -d
) else (
    echo 使用拉取镜像模式...

    REM 确保使用预构建镜像
    powershell -Command "(Get-Content docker-compose.yml) -replace '#    image:', '    image:' -replace '    build:', '#    build:' | Set-Content docker-compose.yml"

    REM 设置默认值
    if "%MIGPT_IMAGE%"=="" set MIGPT_IMAGE=registry.cn-hangzhou.aliyuncs.com/tcwmj/migpt-cli:latest
    if "%PORT%"=="" set PORT=36597

    REM 拉取镜像并启动
    docker-compose pull
    docker-compose up -d
)

REM 等待服务启动
echo 等待服务启动...
timeout /t 5 /nobreak >nul

REM 检查服务状态
docker-compose ps | findstr "Up" >nul
if errorlevel 1 (
    echo 部署失败，请查看日志：docker-compose logs
    pause
    exit /b 1
) else (
    echo ========================================
    echo   部署成功！
    echo ========================================
    echo.
    echo 访问地址：http://localhost:%PORT%
    echo 默认密码：%AUTH_PASSWORD%
    echo.
    echo 常用命令：
    echo   查看日志：docker-compose logs -f
    echo   停止服务：docker-compose down
    echo   重启服务：docker-compose restart
    echo.
    pause
)