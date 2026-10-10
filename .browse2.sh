#!/bin/bash
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
export NO_PROXY='*'; export no_proxy='*'
agent-browser snapshot -i 2>&1 | grep -iE "设备服务|新建|设备" | head -20
echo "-----"
agent-browser click "text=设备服务" 2>&1 | tail -2
sleep 1
agent-browser screenshot 2>&1 | tail -2
