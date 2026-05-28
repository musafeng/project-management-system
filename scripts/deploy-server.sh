#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASES_DIR="${RELEASES_DIR:-/root/project-management-system-releases}"
APP_NAME="${APP_NAME:-project-manager}"
PORT="${PORT:-3000}"
BUILD_TIMEOUT_SECONDS="${BUILD_TIMEOUT_SECONDS:-1800}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-60}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
LOCK_FILE="${LOCK_FILE:-/tmp/project-manager-deploy.lock}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

log() {
  echo "[$1/9] $2"
}

run_health_check() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if curl -fsS "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

get_pm2_cwd() {
  node -e "
const { execSync } = require('child_process');
try {
  const list = JSON.parse(execSync('pm2 jlist', { stdio: ['ignore', 'pipe', 'ignore'] }));
  const app = list.find((item) => item.name === process.env.APP_NAME);
  process.stdout.write(app?.pm2_env?.pm_cwd || '');
} catch {
  process.stdout.write('');
}
" 2>/dev/null || true
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "已有部署任务正在执行，请稍后再试。"
  exit 1
fi

cd "$PROJECT_DIR"

log 1 "同步控制仓库（分支：${DEPLOY_BRANCH}）"
git fetch --depth 1 origin "$DEPLOY_BRANCH"
TARGET_SHA="$(git rev-parse FETCH_HEAD)"
git reset --hard "$TARGET_SHA"
git worktree prune >/dev/null 2>&1 || true

RELEASE_DIR="${RELEASES_DIR}/${TARGET_SHA}-$(date +%Y%m%d%H%M%S)"
OLD_CWD="$(APP_NAME="$APP_NAME" get_pm2_cwd)"

log 2 "创建发布目录 ${RELEASE_DIR}"
mkdir -p "$RELEASES_DIR"
git worktree add --detach "$RELEASE_DIR" "$TARGET_SHA" >/dev/null

for env_file in .env .env.local; do
  if [ -f "${PROJECT_DIR}/${env_file}" ]; then
    cp "${PROJECT_DIR}/${env_file}" "${RELEASE_DIR}/${env_file}"
  fi
done

cd "$RELEASE_DIR"

log 3 "安装依赖"
npm ci --no-audit --no-fund --prefer-offline

log 4 "同步数据库结构"
npx --no-install prisma db push

log 5 "构建生产版本"
timeout "$BUILD_TIMEOUT_SECONDS" npm run build:server

log 6 "切换 PM2 到新版本"
pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs

log 7 "健康检查"
if ! run_health_check; then
  echo "新版本健康检查失败。"
  pm2 logs "$APP_NAME" --lines 80 --nostream || true

  if [ -n "$OLD_CWD" ] && [ -f "${OLD_CWD}/ecosystem.config.cjs" ]; then
    echo "尝试回滚到上一版本：${OLD_CWD}"
    pm2 delete "$APP_NAME" >/dev/null 2>&1 || true
    (cd "$OLD_CWD" && pm2 start ecosystem.config.cjs)
    pm2 save >/dev/null 2>&1 || true
  fi

  exit 1
fi

pm2 save >/dev/null 2>&1 || true

log 8 "清理旧发布"
find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d -print0 \
  | xargs -0 ls -dt 2>/dev/null \
  | tail -n +"$((KEEP_RELEASES + 1))" \
  | xargs -r rm -rf

log 9 "当前状态"
echo "已部署版本：${TARGET_SHA}"
pm2 list
