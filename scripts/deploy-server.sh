#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

echo "[1/7] 停止服务"
pm2 stop project-manager >/dev/null 2>&1 || true

echo "[2/7] 同步代码"
git fetch --depth 1 origin main
git reset --hard origin/main

echo "[3/7] 清理旧构建"
rm -rf .next

echo "[4/7] 安装依赖"
npm install --no-audit --no-fund

echo "[5/7] 构建生产版本"
npm run build:server

echo "[6/7] 启动服务"
pm2 startOrRestart ecosystem.config.cjs
pm2 save >/dev/null 2>&1 || true

echo "[7/7] 当前状态"
pm2 list
