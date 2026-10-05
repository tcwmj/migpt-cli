# migpt-cli 多设备版（lerio 本地版）单容器镜像
# 构建（在源码根目录执行，NAS 上会自动构建 arm64 架构）：
#   docker build -t migpt-cli:latest .
# 运行（单容器管理全部音箱，默认启用登录认证）：
#   docker run -d --name migpt-cli --restart unless-stopped \
#     -p 36592:36592 \
#     -v /volume1/docker/migpt-data:/root/.migptgui \
#     -e AUTH_PASSWORD=你的自定义密码 \
#     migpt-cli:latest

# ── 构建阶段 ────────────────────────────────────────────────
FROM node:20.15.0-alpine3.20 AS build
WORKDIR /app

# 国内镜像加速（lock 文件中的 resolved 也已改写为 npmmirror）
RUN npm config set registry https://registry.npmmirror.com

COPY . .

RUN npm ci --no-audit --no-fund \
 && npm run build-all \
 && npm prune --omit=dev

# ── 运行阶段 ────────────────────────────────────────────────
FROM node:20.15.0-alpine3.20
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/ .
EXPOSE 36592
VOLUME /root/.migptgui
ENTRYPOINT ["node", "apps/server/dist/index.js"]
