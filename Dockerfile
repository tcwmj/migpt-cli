# migpt-cli 多设备版（lerio 本地版）单容器镜像
#
# 与 docker/Dockerfile 的区别（两者不可混用）：
#   - 本文件       ：从源码全量构建，产出「单容器跑完整应用」的镜像，上下文=仓库根
#   - docker/Dockerfile：不构建源码，直接安装已发布的 npm 包 migpt-server，上下文=docker/
#
# 构建（在源码根目录执行，NAS 上会自动构建 arm64 架构）：
#   docker build -t migpt-cli:latest .
# 运行（单容器管理全部音箱，默认启用登录认证）：
#   docker run -d --name migpt-cli --restart unless-stopped \
#     -p 36597:36597 \
#     -v /volume1/docker/migpt-data:/home/node/.migptgui \
#     -e AUTH_PASSWORD=你的自定义密码 \
#     -e PORT=36597 \
#     migpt-cli:latest
#
# ── 国内构建提速设计 ────────────────────────────────────────
#   1. 依赖层缓存：先 COPY 全部 workspace 清单 + lock 执行 npm ci，再 COPY 源码。
#      日常改代码重新构建时依赖层直接命中缓存（~15min → ~3min；lock 变更才重装）。
#      注：GitHub 直拉构建每次 clone 内容相同，只要 package-lock.json 未变即命中。
#   2. Prisma 引擎二进制走 npmmirror 镜像：mi-gpt 依赖 @prisma/client，其 postinstall
#      默认从 binaries.prisma.sh 下载 ~19MB 引擎（国内极慢，npm ci 卡住的主因之一）。
#      PRISMA_ENGINES_MIRROR 指向 npmmirror 后秒下。
#      （不能用 --ignore-scripts 跳过——client 未生成会导致运行时崩溃，已实测确认。）
#   3. npm 源 npmmirror；显式设 replace-registry-host=npmjs，强制把 lockfile 中
#      1300+ 条指向 registry.npmjs.org 的 resolved URL 改写到 npmmirror（不依赖 npm 默认值，
#      跨 npm 版本稳定生效）；关 progress/audit/fund 减少无效 IO 与输出。
#   4. apk 换阿里云源（默认 dl-cdn 国内不可达）。
#   5. 兼容群晖经典构建器：不用 BuildKit 专属语法（COPY --chmod、RUN --mount=cache 等）。

# ── 构建阶段 ────────────────────────────────────────────────
# node 版本需与根 .nvmrc 保持一致
FROM node:24.21.0-alpine3.23 AS build
WORKDIR /app

# Prisma（mi-gpt 依赖）在 Alpine 上需要 OpenSSL 与 glibc 兼容层：
# 缺失时 npm ci 阶段 mi-gpt 的 postinstall（prisma migrate）报
# "prisma:warn Prisma failed to detect the libssl/openssl version to use"
# su-exec：入口脚本以 root 修正挂载目录属主后降权运行（见 scripts/docker-entrypoint.sh）
RUN sed -i 's|https\?://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories \
 && apk add --no-cache openssl libc6-compat su-exec

# 提速与降噪的环境变量（在 npm ci 之前设置才能全部生效）：
#   - registry → npmmirror；replace-registry-host=npmjs 显式强制 npm ci 把 lockfile 中
#     指向 registry.npmjs.org 的 resolved URL 统一改写到 npmmirror（不依赖 npm 默认行为）
#   - PRISMA_ENGINES_MIRROR → Prisma 引擎二进制（~19MB）改走 npmmirror，默认 binaries.prisma.sh 国内极慢
#   - TERM=dumb + npm_config_color=false → 群晖日志查看器不渲染 ANSI 色码，显示为乱码
#   - progress=false → 关闭进度条（非 tty 环境下的无效输出）
ENV TERM=dumb \
    npm_config_color=false \
    npm_config_fund=false \
    npm_config_audit=false \
    npm_config_progress=false \
    npm_config_registry=https://registry.npmmirror.com \
    npm_config_replace_registry_host=npmjs \
    PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma

# ── 依赖层（低频变更，优先缓存）────────────────────────────
# 全部 workspace 清单 + 根 lock 先行 COPY；根 postinstall（token 补丁）依赖 patches/，
# 补丁脚本幂等且低频变更，随清单一并进入缓存层
COPY package.json package-lock.json ./
COPY patches/ patches/
COPY apps/cli/package.json apps/cli/
COPY apps/server/package.json apps/server/
COPY packages/contracts/package.json packages/contracts/
COPY packages/controller/package.json packages/controller/
COPY packages/gui/package.json packages/gui/
COPY packages/options/package.json packages/options/
COPY packages/options-with-preview/package.json packages/options-with-preview/
COPY packages/server/package.json packages/server/

RUN npm ci --no-audit --no-fund

# ── 源码层（高频变更）──────────────────────────────────────
COPY . .

# 显式应用 mi-gpt token 用量补丁（双保险：依赖层 npm ci 的根 postinstall 已跑过一次，
# 脚本幂等——已应用则跳过；此处确保缓存命中场景下补丁一定生效）
# .cache 是构建期缓存（babel/nx/coverage），不进运行镜像
RUN node patches/mi-gpt-token-usage.js \
 && npm run build \
 && npm prune --omit=dev \
 && rm -rf .cache

# ── 运行阶段 ────────────────────────────────────────────────
FROM node:24.21.0-alpine3.23
WORKDIR /app
ENV NODE_ENV=production \
    PORT=36597 \
    HOME=/home/node \
    TERM=dumb
# 运行时同样依赖 OpenSSL / glibc 兼容层（Prisma 引擎为 musl 动态链接库）；
# su-exec 供入口脚本降权；apk 源同样换阿里云
RUN sed -i 's|https\?://dl-cdn.alpinelinux.org|https://mirrors.aliyun.com|g' /etc/apk/repositories \
 && apk add --no-cache openssl libc6-compat su-exec
COPY --from=build /app/ .
# 入口脚本以 root 启动 → 修正宿主挂载目录属主 → su-exec 降权到 node 运行服务。
# 服务进程仍以非 root（node，uid 1000）执行；不在此处写 USER node，
# 否则容器无法修复 bind mount 目录属主（群晖 File Station 建的目录归 root）。
# 注意：不用 COPY --chmod（BuildKit 专属语法），群晖经典构建器不支持，改 RUN chmod
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh
EXPOSE 36597
VOLUME /home/node/.migptgui

# 健康检查：/ping 由 @migptgui/server 提供，无需认证
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:${PORT}/ping || exit 1

# 镜像元数据（G11）：version / revision / created 由 CI 经 --build-arg 注入；
# 本地构建未注入时回落占位值，保证 label 齐全可查。
ARG VERSION=dev
ARG REVISION=unknown
ARG CREATED
LABEL org.opencontainers.image.title="migpt-cli（多设备版）" \
      org.opencontainers.image.description="多台音箱、一个大脑：多设备 MiGPT 控制面板（单容器）" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/tcwmj/migpt-cli" \
      org.opencontainers.image.documentation="https://github.com/tcwmj/migpt-cli#readme" \
      org.opencontainers.image.vendor="tcwmj" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}"

ENTRYPOINT ["docker-entrypoint.sh"]
