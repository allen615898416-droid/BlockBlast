#!/bin/bash
# BlockBlast gradle assembleRelease（cocos-android-cli-build skill 规范）
ROOT="/Users/ivan/WorkBuddy/blcokwin/BlockBlast"
LOG="$ROOT/gradle-build.log"
GRADLE=$(ls -d ~/.gradle/wrapper/dists/gradle-8.11.1-bin/*/gradle-8.11.1/bin/gradle 2>/dev/null | head -1)

export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.0.19.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_USER_HOME="$ROOT/.android-home"
mkdir -p "$ANDROID_USER_HOME"
GUH="$ROOT/.gradle-home"
mkdir -p "$GUH"

cd "$ROOT/build/android/proj" || exit 1
"$GRADLE" -g "$GUH" :block-blast:assembleRelease --console=plain --no-daemon >> "$LOG" 2>&1
echo "EXITCODE=$?" >> "$LOG"
echo "FINISHED" >> "$LOG"
