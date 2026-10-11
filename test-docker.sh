#!/bin/bash
# Docker 配置测试脚本

set -e

echo "========================================="
echo "  Docker 配置测试"
echo "========================================="

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi
echo "✅ Docker 已安装"

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose 未安装"
    exit 1
fi
echo "✅ Docker Compose 已安装"

# 检查配置文件
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml 文件不存在"
    exit 1
fi
echo "✅ docker-compose.yml 文件存在"

if [ ! -f .env.example ]; then
    echo "❌ .env.example 文件不存在"
    exit 1
fi
echo "✅ .env.example 文件存在"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  .env 文件不存在，正在从模板创建..."
    cp .env.example .env
    echo "✅ .env 文件已创建"
else
    echo "✅ .env 文件存在"
fi

# 验证 docker-compose.yml 语法
echo ""
echo "验证 docker-compose.yml 语法..."
if docker-compose config > /dev/null 2>&1; then
    echo "✅ docker-compose.yml 语法正确"
else
    echo "❌ docker-compose.yml 语法错误"
    docker-compose config
    exit 1
fi

# 测试镜像拉取（可选）
echo ""
read -p "是否测试拉取镜像？(y/N): " TEST_PULL
if [[ $TEST_PULL =~ ^[Yy]$ ]]; then
    echo "正在拉取镜像..."
    docker-compose pull
    echo "✅ 镜像拉取成功"
fi

# 测试容器启动（可选）
echo ""
read -p "是否测试启动容器？(y/N): " TEST_RUN
if [[ $TEST_RUN =~ ^[Yy]$ ]]; then
    echo "正在启动容器..."
    docker-compose up -d

    # 等待容器启动
    echo "等待容器启动..."
    sleep 10

    # 检查容器状态
    if docker-compose ps | grep -q "Up"; then
        echo "✅ 容器启动成功"

        # 测试健康检查
        echo "测试健康检查..."
        if curl -s http://localhost:36597/ping > /dev/null 2>&1; then
            echo "✅ 健康检查通过"
        else
            echo "⚠️  健康检查失败（可能需要等待更长时间）"
        fi

        # 显示访问信息
        echo ""
        echo "========================================="
        echo "  测试成功！"
        echo "========================================="
        echo "访问地址：http://localhost:36597"
        echo "查看日志：docker-compose logs -f"
        echo "停止容器：docker-compose down"
    else
        echo "❌ 容器启动失败"
        docker-compose logs
        docker-compose down
        exit 1
    fi
else
    echo ""
    echo "========================================="
    echo "  配置测试完成"
    echo "========================================="
    echo "配置文件验证通过，可以使用以下命令启动服务："
    echo ""
    echo "  docker-compose up -d"
    echo ""
fi