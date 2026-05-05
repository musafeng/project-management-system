#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

echo "[1/8] 停止服务"
pm2 stop project-manager >/dev/null 2>&1 || true

echo "[2/8] 同步代码"
git fetch --depth 1 origin main
git reset --hard origin/main

echo "[3/8] 清理旧构建"
rm -rf .next

echo "[4/8] 安装依赖"
npm ci --no-audit --no-fund
git diff --exit-code -- package-lock.json >/dev/null || {
  echo "错误：依赖安装修改了 package-lock.json，请先在本地提交锁文件变化后再部署。"
  exit 1
}

echo "[5/8] 同步数据库结构"
npx prisma db push

echo "[6/8] 构建生产版本"
npm run build:server

echo "[7/8] 启动服务"
pm2 startOrRestart ecosystem.config.cjs
pm2 save >/dev/null 2>&1 || true

echo "[8/8] 当前状态"
pm2 list
