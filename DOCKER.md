# Docker 部署指南

## 快速开始

### 方式一：使用预构建镜像（推荐）

```bash
# 1. 复制配置文件
cp .env.example .env

# 2. 编辑配置
vim .env
# 设置 AUTH_PASSWORD（必填）
# 可选：修改 MIGPT_IMAGE 为其他镜像地址

# 3. 启动服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

### 方式二：本地构建镜像

```bash
# 1. 使用本地构建模式
docker-compose up --build -d

# 2. 或使用部署脚本
./deploy.sh  # Linux/macOS
deploy.bat   # Windows
```

## 配置说明

### 环境变量

| 变量            | 必填 | 默认值                                                     | 说明     |
| --------------- | ---- | ---------------------------------------------------------- | -------- |
| `AUTH_PASSWORD` | 是   | -                                                          | 访问密码 |
| `PORT`          | 否   | `36597`                                                    | 服务端口 |
| `MIGPT_IMAGE`   | 否   | `registry.cn-hangzhou.aliyuncs.com/tcwmj/migpt-cli:latest` | 镜像地址 |

### 数据卷

容器内数据目录：`/home/node/.migptgui`

挂载到宿主机后，包含以下数据：

- `accounts.json` - 账号配置
- `robots.json` - 对话角色
- `models.json` - 模型配置
- `voices.json` - 语音配置
- `speakerModels.json` - 音箱型号
- `conversations.json` - 会话数据
- `credentials.json` - 凭据信息
- `devices/` - 设备数据
- `backups/` - 备份文件
- `logs/` - 日志文件

## 镜像仓库

### 阿里云容器镜像服务（国内推荐）

```bash
# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/tcwmj/migpt-cli:latest

# 运行容器
docker run -d --name migpt-cli \
  --restart unless-stopped \
  -p 36597:36597 \
  -v /path/to/data:/home/node/.migptgui \
  -e AUTH_PASSWORD=your_password \
  registry.cn-hangzhou.aliyuncs.com/tcwmj/migpt-cli:latest
```

### Docker Hub

```bash
# 拉取镜像
docker pull tcwmj/migpt-cli:latest

# 运行容器
docker run -d --name migpt-cli \
  --restart unless-stopped \
  -p 36597:36597 \
  -v /path/to/data:/home/node/.migptgui \
  -e AUTH_PASSWORD=your_password \
  tcwmj/migpt-cli:latest
```

### GitHub Container Registry

```bash
# 拉取镜像
docker pull ghcr.io/tcwmj/migpt-cli:latest

# 运行容器
docker run -d --name migpt-cli \
  --restart unless-stopped \
  -p 36597:36597 \
  -v /path/to/data:/home/node/.migptgui \
  -e AUTH_PASSWORD=your_password \
  ghcr.io/tcwmj/migpt-cli:latest
```

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 查看容器状态
docker-compose ps

# 进入容器
docker-compose exec migpt-cli sh

# 更新镜像
docker-compose pull
docker-compose up -d
```

## 升级与回滚

### 升级

1. 拉取新版本镜像
2. 停止当前容器
3. 启动新容器（使用相同数据卷）

```bash
# 方式一：使用 docker-compose
docker-compose pull
docker-compose up -d

# 方式二：手动操作
docker pull registry.cn-hangzhou.aliyuncs.com/tcwmj/migpt-cli:latest
docker-compose down
docker-compose up -d
```

### 回滚

1. 停止当前容器
2. 启动旧版本容器（使用相同数据卷）

```bash
# 查看可用版本
docker images | grep migpt-cli

# 使用特定版本
docker-compose down
# 修改 .env 文件中的 MIGPT_IMAGE 为旧版本
docker-compose up -d
```

## 故障排查

### 查看日志

```bash
# 查看容器日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail 100
```

### 检查容器状态

```bash
# 查看容器状态
docker-compose ps

# 查看容器详细信息
docker inspect migpt-cli
```

### 进入容器调试

```bash
# 进入容器
docker-compose exec migpt-cli sh

# 查看进程
ps aux

# 查看网络
netstat -tlnp
```

### 健康检查

```bash
# 检查健康状态
docker inspect --format='{{.State.Health.Status}}' migpt-cli

# 手动测试健康检查
curl http://localhost:36597/ping
```

## 性能优化

### 资源限制

在 `docker-compose.yml` 中配置：

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 128M
```

### 日志管理

```yaml
logging:
  driver: 'json-file'
  options:
    max-size: '10m'
    max-file: '3'
```

## 安全建议

1. **修改默认密码**：务必设置强密码
2. **使用 HTTPS**：公网部署时配置反向代理
3. **限制访问**：使用防火墙限制端口访问
4. **定期备份**：配置自动备份策略
5. **更新镜像**：定期更新到最新版本

## 阿里云容器镜像服务配置

### 1. 创建命名空间

1. 登录 [阿里云容器镜像服务](https://cr.console.aliyun.com)
2. 创建命名空间（如：`tcwmj`）

### 2. 创建仓库

1. 创建仓库（如：`migpt-cli`）
2. 选择「本地仓库」

### 3. 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

- `ALIYUN_REGISTRY_USERNAME`：阿里云账号
- `ALIYUN_REGISTRY_PASSWORD`：阿里云密码或专用密码

### 4. 自动构建

推送 tag 后，GitHub Actions 会自动构建并推送到阿里云：

```bash
# 创建 tag
git tag migptgui@2.0.0
git push origin migptgui@2.0.0
```

## 常见问题

### Q: 如何修改端口？

A: 修改 `.env` 文件中的 `PORT` 变量，然后重启容器。

### Q: 如何备份数据？

A: 备份挂载的数据卷目录即可。

### Q: 如何查看容器资源使用情况？

A: 使用 `docker stats migpt-cli` 命令。

### Q: 容器启动失败怎么办？

A: 查看日志 `docker-compose logs`，检查配置是否正确。
