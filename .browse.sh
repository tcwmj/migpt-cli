#!/bin/bash
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy
export NO_PROXY='*'; export no_proxy='*'
agent-browser open "http://127.0.0.1:36611/" 2>&1
echo "OPEN_EXIT:$?"
sleep 2
agent-browser wait --load load 2>&1 | tail -2
agent-browser screenshot 2>&1 | tail -5
echo "SHOT_EXIT:$?"
