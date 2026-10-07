# migpt-cli 多设备版（lerio 本地版）单容器镜像
# 构建（在源码根目录执行，NAS 上会自动构建 arm64 架构）：
#   docker build -t migpt-cli:latest .
# 运行（单容器管理全部音箱，默认启用登录认证）：
#   docker run -d --name migpt-cli --restart unless-stopped \
#     -p 36597:36597 \
#     -v /volume1/docker/migpt-data:/home/node/.migptgui \
#     -e AUTH_PASSWORD=你的自定义密码 \
#     -e PORT=36597 \
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
ENV NODE_ENV=production \
    PORT=36597 \
    HOME=/home/node
COPY --from=build /app/ .
# 非 root 运行（node 用户），数据目录挂载到 /home/node/.migptgui
USER node
EXPOSE 36597
VOLUME /home/node/.migptgui

# 健康检查：/ping 由 @migptgui/server 提供，无需认证
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:${PORT}/ping || exit 1

LABEL org.opencontainers.image.title="migpt-cli（多设备版）" \
      org.opencontainers.image.description="多台音箱、一个大脑：多设备 MiGPT 控制面板（单容器）" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/tcwmj/migpt-cli"

ENTRYPOINT ["node", "apps/server/dist/index.js"]
