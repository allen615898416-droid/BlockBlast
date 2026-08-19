#!/bin/bash
# BlockBlast Android CLI 构建脚本（cocos-android-cli-build skill 规范）
ROOT="/Users/ivan/WorkBuddy/blcokwin/BlockBlast"
COCOS="/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator"
LOG="$ROOT/build-cli.log"

unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy FTP_PROXY ftp_proxy
export NO_PROXY="*"

pkill -9 -f CocosCreator 2>/dev/null
sleep 1

env -u ELECTRON_RUN_AS_NODE "$COCOS" --no-sandbox --enable-features=NetworkServiceInProcess \
  --project "$ROOT" --build "configPath=$ROOT/.scripts/android_build_config.json" >> "$LOG" 2>&1
echo "EXITCODE=$?" >> "$LOG"
echo "FINISHED" >> "$LOG"
