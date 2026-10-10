#!/bin/bash
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
export NO_PROXY='*'; export no_proxy='*'
# 直接点侧边栏「设备服务」
agent-browser click "text=设备服务" 2>&1 | tail -1
sleep 1
agent-browser screenshot 2>&1 | tail -1
