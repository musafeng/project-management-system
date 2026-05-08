#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

restore_lockfile_if_changed() {
  if ! git diff --quiet -- package-lock.json; then
    echo "提示：检测到服务器 npm 改写了 package-lock.json 元数据，已按仓库版本恢复。"
    git checkout -- package-lock.json
  fi
}

echo "[1/8] 停止服务"
pm2 stop project-manager >/dev/null 2>&1 || true

echo "[2/8] 同步代码"
git fetch --depth 1 origin main
git reset --hard origin/main

echo "[3/8] 清理旧构建"
rm -rf .next

echo "[4/8] 安装依赖"
npm ci --no-audit --no-fund
restore_lockfile_if_changed

echo "[5/8] 同步数据库结构"
npx --no-install prisma db push
restore_lockfile_if_changed

echo "[6/8] 构建生产版本"
npm run build:server
restore_lockfile_if_changed

echo "[7/8] 启动服务"
pm2 startOrRestart ecosystem.config.cjs
pm2 save >/dev/null 2>&1 || true

echo "[8/8] 当前状态"
pm2 list
