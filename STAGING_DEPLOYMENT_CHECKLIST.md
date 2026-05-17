# Staging 部署检查清单

生成时间：2026-05-17
分支：`staging/claude-handover-ux-dingtalk`
HEAD：`e2c252f chore: add CLAUDE.md project rules and project-local skills`
本仓库部署模型：多版本发布目录 + 健康检查失败自动回滚（`scripts/deploy-server.sh`）

---

## 一、本地检查结果（已执行）

| 项 | 命令 | 结果 |
|----|------|------|
| Node 版本 | `node -v` | v20.20.2 ✅ |
| npm 版本 | `npm -v` | 10.8.2 ✅ |
| node_modules | `ls node_modules` | 存在 ✅ |
| package-lock.json | `ls package-lock.json` | 存在 ✅ |
| Prisma client 生成 | `npm run prisma:generate` | 通过 ✅（v5.22.0，288ms） |
| 类型检查 | `npx tsc --noEmit` | 通过 ✅（exit=0，无输出） |
| ESLint | `npm run lint` | 通过 ✅（无 warning / error） |
| 生产构建 | `npm run build:server` | 通过 ✅（全部路由编译） |
| 工作区状态 | `git status --short` | 干净 ✅ |
| 部署脚本完整性 | 检查 `scripts/deploy-server.sh` | 主线安全版本 ✅（多版本目录 + 自动回滚 + 可执行位 755） |
| stash 备份 | `git stash list` | `stash@{0}` 保留了之前未完成的部署脚本改造 ✅ |

**结论：本地所有阻断项通过，可以进入服务器部署阶段。**

---

## 二、部署脚本核对（仅检查，未修改）

`scripts/deploy-server.sh` 当前状态：

- 文件权限 `-rwxr-xr-x`（可执行位完好）
- 9 步部署流程：同步控制仓库 → 创建发布目录 → 安装依赖 → 同步 DB → 构建 → 切换 PM2 → 健康检查 → 保存 → 清理旧发布
- 含 `RELEASES_DIR=/root/project-management-system-releases`（多版本目录）
- 含 `KEEP_RELEASES=3`（保留最近 3 版）
- 含 `get_pm2_cwd()` + 健康检查失败时自动回滚到 `OLD_CWD`
- 含 `git worktree add --detach` 隔离发布目录
- **不是**之前 stash 起来的"原地 git reset --hard 覆盖部署"危险版本

---

## 三、服务器端部署前确认（用户在服务器上自行核对）

以下条目**本地无法替你确认**，部署前由你或运维同学在生产服务器上过一遍：

### 3.1 服务器环境
- [ ] 服务器已切换到 `staging/claude-handover-ux-dingtalk` 分支（或 deploy 脚本已配置 `git fetch ... <staging分支>`）
- [ ] 服务器 Node 版本 ≥ 20.x（与本地 v20.20.2 对齐）
- [ ] 服务器 PM2 已安装且 `APP_NAME=project-manager` 进程在跑
- [ ] 部署脚本默认从 `origin main` 拉取——**测试部署需要把脚本里 `git fetch --depth 1 origin main` 临时换成 staging 分支，或单独写个 staging 部署脚本**（见下方"四、部署命令选择"）

### 3.2 配置与环境变量
- [ ] `.env` 在服务器上已存在且完整（数据库连接、钉钉 corpId/appKey/appSecret、OSS 密钥、签名 secret）
- [ ] `.env.example` 与 `.env` 没有缺字段
- [ ] `RELEASES_DIR` 指向的目录存在且有写权限（默认 `/root/project-management-system-releases`）
- [ ] `/tmp/project-manager-deploy.lock` 没有遗留死锁文件

### 3.3 数据库
- [ ] 当前部署**不需要 schema 变更**（本次 staging 分支领先 main 仅是前端/UI/接口改动，Prisma schema 未动；如果改了请暂停部署）
- [ ] 数据库连接可达，备份策略已就位

### 3.4 用户层面
- [ ] 测试时间窗口已和真实用户沟通（避开高峰）
- [ ] 测试用钉钉账号已准备：1 个普通员工、1 个审批人、1 个管理员
- [ ] 真机准备：iOS 钉钉 + Android 钉钉至少各一台

---

## 四、部署命令选择

部署脚本目前是从 `origin main` 拉取的。要把 `staging/claude-handover-ux-dingtalk` 部到测试环境，**有两种方案**，请选择一种：

### 方案 A（推荐）：临时改 deploy 脚本指向 staging
1. 在服务器上 `git checkout staging/claude-handover-ux-dingtalk`
2. 把 `scripts/deploy-server.sh` 第 51 行的 `git fetch --depth 1 origin main` 改为 `git fetch --depth 1 origin staging/claude-handover-ux-dingtalk`
3. 同时把第 52 行的目标 SHA 取自 staging 分支
4. 这个修改**只在服务器侧本地修改，不要 commit 回仓库**（避免污染主线）
5. 执行 `npm run deploy:server`

### 方案 B：另起一个 staging 部署目录
1. 在另一台测试机或另一个端口跑 staging
2. `git clone` 一份新仓库到 `/root/project-manager-staging`
3. 在新目录中 `git checkout staging/claude-handover-ux-dingtalk`
4. 复制一份 `scripts/deploy-server.sh`，改名 `deploy-staging.sh`，把分支和 `RELEASES_DIR`、`APP_NAME`、`PORT` 全换成 staging 专用值
5. 执行 `bash scripts/deploy-staging.sh`

**强烈建议方案 B**：和生产完全隔离，不需要动主部署脚本，测试出问题不会污染生产 PM2 进程列表。

### 应急回滚
- 部署脚本本身在健康检查失败时会自动回滚到 `OLD_CWD`
- 手动回滚：`pm2 delete project-manager && cd <旧的 RELEASE_DIR> && pm2 start ecosystem.config.cjs`
- 极限回滚：切回 main `git checkout main && bash scripts/deploy-server.sh`（注意这是回到生产基线）

---

## 五、本地一键预演（可选）

部署前如果想再保险，可在本地或一台 staging 机器上跑：

```bash
# 干净起一个生产模式实例
npm ci --no-audit --no-fund --prefer-offline
npm run prisma:generate
NODE_OPTIONS=--max-old-space-size=1024 npm run build:server
PORT=3001 npm run start
# 浏览器访问 http://127.0.0.1:3001 看首屏是否能起来
```

---

## 六、阻断项与风险

| 项 | 状态 | 备注 |
|----|------|------|
| 业务代码改动 | ❌ 无 | 本次只改了 CLAUDE.md / .claude / 审计文档 |
| 数据库 schema 改动 | ❌ 无 | `prisma/schema.prisma` 未动 |
| 依赖变化 | ❌ 无 | `package.json` / `package-lock.json` 未动 |
| `scripts/deploy-server.sh` | ⚠️ 已 stash 危险改动，主线安全版本完好 | 部署前不要 `git stash pop` |
| 钉钉、附件、审批、收付款、登录、权限 | ❌ 无改动 | CLAUDE.md 第四节列出的 5 大核心未受影响 |
| `fix/launch-finalize` 路线 | ⚠️ 未合入，独立存在 | 部署不涉及，不需处理 |

**结论：可以部署。建议方案 B。**

---

## 七、部署后验收最低门槛

部署成功后，先做这 3 件事再放手让真实用户测：

1. 浏览器访问 `https://<staging域名>/` 不 502，能进登录页
2. 钉钉免登跑通（用一个普通账号试）
3. 打开任一带审批的页面（如"待我审批"），列表能加载、详情能打开

通过后再交给 `MANUAL_TEST_CHECKLIST.md` 的真实人工测试。
