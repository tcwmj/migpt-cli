#!/bin/bash
# migpt-cli 一键部署脚本
# 用法：./deploy.sh [本地构建|拉取镜像]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
DEFAULT_IMAGE="registry.cn-hangzhou.aliyuncs.com/tcwmj/migpt-cli:latest"
DEFAULT_PORT="36597"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  migpt-cli Docker 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误：Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}错误：Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

# 创建 .env 文件（如果不存在）
if [ ! -f .env ]; then
    echo -e "${YELLOW}未找到 .env 文件，正在从模板创建...${NC}"
    cp .env.example .env
    echo -e "${GREEN}已创建 .env 文件，请编辑配置后重新运行此脚本${NC}"
    echo -e "${YELLOW}配置文件位置：$(pwd)/.env${NC}"
    exit 0
fi

# 加载环境变量
source .env

# 检查必要配置
if [ -z "$AUTH_PASSWORD" ] || [ "$AUTH_PASSWORD" = "your_secure_password_here" ]; then
    echo -e "${RED}错误：请在 .env 文件中设置 AUTH_PASSWORD${NC}"
    exit 1
fi

# 选择部署模式
echo ""
echo "请选择部署模式："
echo "1) 拉取预构建镜像（推荐，速度快）"
echo "2) 本地构建镜像（适合开发调试）"
read -p "请输入选项 [1]: " DEPLOY_MODE
DEPLOY_MODE=${DEPLOY_MODE:-1}

if [ "$DEPLOY_MODE" = "2" ]; then
    echo -e "${YELLOW}使用本地构建模式...${NC}"

    # 更新 docker-compose.yml 启用本地构建
    sed -i 's|# build:|build:|' docker-compose.yml
    sed -i 's|#   context: .|  context: .|' docker-compose.yml
    sed -i 's|#   dockerfile: Dockerfile|  dockerfile: Dockerfile|' docker-compose.yml
    sed -i 's|#   args:|  args:|' docker-compose.yml
    sed -i 's|#     VERSION: ${VERSION:-dev}|    VERSION: ${VERSION:-dev}|' docker-compose.yml
    sed -i 's|#     REVISION: ${REVISION:-unknown}|    REVISION: ${REVISION:-unknown}|' docker-compose.yml

    # 注释掉 image 行
    sed -i 's|^    image:|#    image:|' docker-compose.yml

    # 获取版本信息
    VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "dev")
    REVISION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

    # 启动构建
    docker-compose up --build -d

else
    echo -e "${YELLOW}使用拉取镜像模式...${NC}"

    # 确保使用预构建镜像
    sed -i 's|^#    image:|    image:|' docker-compose.yml
    sed -i 's|^    build:|#    build:|' docker-compose.yml
    sed -i 's|^#      context: .|      context: .|' docker-compose.yml

    # 设置镜像地址
    export MIGPT_IMAGE=${MIGPT_IMAGE:-$DEFAULT_IMAGE}
    export PORT=${PORT:-$DEFAULT_PORT}

    # 拉取镜像并启动
    docker-compose pull
    docker-compose up -d
fi

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 5

# 检查服务状态
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  部署成功！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "访问地址：http://localhost:${PORT:-36597}"
    echo -e "默认密码：${AUTH_PASSWORD}"
    echo ""
    echo -e "常用命令："
    echo -e "  查看日志：docker-compose logs -f"
    echo -e "  停止服务：docker-compose down"
    echo -e "  重启服务：docker-compose restart"
    echo ""
else
    echo -e "${RED}部署失败，请查看日志：docker-compose logs${NC}"
    exit 1
fi