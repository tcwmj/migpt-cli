#!/bin/sh
# migpt-cli 容器入口：兼容「宿主 bind mount 目录属主非 node」的部署环境（如群晖）。
#
# 数据目录是宿主挂载，属主由宿主决定（File Station / sudo mkdir 建的目录归 root），
# 镜像内 chown 无效（挂载后会被盖住）。因此容器先以 root 启动：
#   1. 修正数据目录属主为 node（1000:1000）
#   2. 用 su-exec 降权到 node 用户运行服务（进程仍非 root，安全模型不变）
# 已是 node 用户启动时（如 docker run --user 1000）直接 exec 服务。
set -e

# 与 packages/server/src/paths.ts 的数据根解析保持一致：MIGPTGUI_HOME > DATA_DIR > $HOME/.migptgui
DATA="${MIGPTGUI_HOME:-${DATA_DIR:-$HOME/.migptgui}}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA"
  # 仅当顶层属主不对时才递归 chown（日志文件可能很多，避免每次启动全量遍历）
  if [ "$(stat -c '%u' "$DATA")" != "1000" ]; then
    chown -R node:node "$DATA"
  fi
  exec su-exec node "$0" "$@"
fi

exec node apps/server/dist/index.js "$@"
