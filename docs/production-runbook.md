# 生产上线 Runbook

本文件只定义当前仓库在 2026-04 的最小可执行生产发布闭环。

## 1. 上线前提

- 代码目录已拉到目标发布 commit。
- 已准备好生产 PostgreSQL。
- 已准备好钉钉应用配置、OSS 配置。
- 已确认系统管理员白名单 `SYSTEM_MANAGER_DING_USER_IDS`。
- 已确认首次初始化所需系统用户、流程、表单、区域脚本执行窗口。

## 2. 环境变量

先复制环境模板：

```bash
cp .env.example .env.production
```

生产至少必须配置以下变量：

- `DATABASE_URL`
- `DINGTALK_CORP_ID`
- `DINGTALK_CLIENT_ID`
- `DINGTALK_CLIENT_SECRET`
- `DINGTALK_AGENT_ID`
- `DINGTALK_WEB_LOGIN_REDIRECT_URI`
- `NEXT_PUBLIC_DINGTALK_CORP_ID`
- `NEXT_PUBLIC_DINGTALK_CLIENT_ID`
- `SYSTEM_MANAGER_DING_USER_IDS`
- `NEXT_PUBLIC_SYSTEM_MANAGER_DING_USER_IDS`
- `OSS_REGION`
- `OSS_ACCESS_KEY_ID`
- `OSS_ACCESS_KEY_SECRET`
- `OSS_BUCKET`

说明：

- `SYSTEM_MANAGER_DING_USER_IDS` 与 `NEXT_PUBLIC_SYSTEM_MANAGER_DING_USER_IDS` 必须保持一致，否则会出现“后端有系统管理权限、前端菜单却不显示”。
- `DINGTALK_CORP_ID` 与 `NEXT_PUBLIC_DINGTALK_CORP_ID` 必须一致。
- `DINGTALK_CLIENT_ID` 与 `NEXT_PUBLIC_DINGTALK_CLIENT_ID` 必须一致。
- `OSS_CUSTOM_DOMAIN` 可选；未配置时使用 OSS 默认域名。

## 3. 启动期强校验

仓库已接入统一环境校验脚本：

- `npm run dev`
- `npm run build`
- `npm start`

上述命令都会先执行：

```bash
node scripts/validate-env.js <mode>
```

其中：

- `build` / `start` 为强校验，缺项直接失败。
- `dev` 为警告模式，便于本地开发。

## 4. 数据库上线策略

当前仓库 **不能假设** 只靠 `prisma migrate deploy` 就能从空库拉起整套生产库。

原因：

- `prisma/schema.prisma` 已包含完整业务模型。
- `prisma/migrations` 目前只有后期增量迁移，不是全量基线。

因此生产数据库必须分两种情况处理：

### 4.1 现有生产库 / 已经存在完整业务表结构

使用下面流程：

```bash
npx prisma migrate status
npx prisma generate
npx prisma migrate deploy
```

要求：

- 只在目标库已经具备完整历史业务表结构时执行。
- 先做数据库备份。
- `migrate status` 若发现漂移或失败，不要直接强跑 `migrate deploy`。

### 4.2 新环境 / 空库 / 结构不完整的库

当前推荐方案：

1. 先从“已验证可用的现网/准生产库”导出一份 **基线 schema**。
2. 由 DBA 或发布负责人先把基线 schema 导入目标库。
3. 导入完成后，再执行：

```bash
npx prisma generate
npx prisma migrate deploy
```

注意：

- 当前仓库没有全量基线迁移，所以 **不要** 在空库上直接执行 `prisma migrate deploy` 期待自动建全库。
- 如果基线已经包含当前 3 个迁移里的变更，需要先人工确认，再决定是否使用 `prisma migrate resolve --applied ...` 标记已应用。

## 5. 首次初始化命令

首次上线或新环境初始化时，统一执行：

```bash
npx prisma generate
npm run init:system
```

说明：

- `npm run init:system` 是 fresh 环境唯一推荐初始化入口。
- 它会统一完成：
  - 首个系统管理员 bootstrap
  - 基础 seed
  - 默认区域初始化
  - `construction-approvals` 表单定义
  - 关键审批人检查
  - 审批流程定义
- 详细说明见 [docs/init-system-runbook.md](/Users/a1/.cursor/worktrees/project-manager/kai/docs/init-system-runbook.md)。

## 6. 第一批正式替换氚云上线范围

第一批正式替换范围只包含当前已经达到成熟水位、可直接给员工使用的页面：

- `/`
- `/approval`
- `/projects`
- `/project-contracts`
- `/contract-receipts`
- `/other-receipts`
- `/procurement-contracts`
- `/procurement-payments`
- `/labor-contracts`
- `/labor-payments`
- `/subcontract-contracts`
- `/subcontract-payments`
- `/management-expenses`
- `/sales-expenses`
- `/petty-cashes`
- `/other-payments`

以下入口不纳入第一批正式替换范围，也不再挂在正式左侧菜单中：

- `/payment-apply`
  当前仍是分步申请向导，不是成熟台账页；本轮已补最小审批提交失败显式报错，但仍不适合作为第一批正式替换入口。
- `/construction-approvals`
  当前还缺导出、附件、成熟详情查看、服务器分页，不属于第一批成熟成品范围。

## 7. 发布步骤

推荐用 PM2 托管，并通过 `npm start` 走环境校验。

### 7.1 标准发布

```bash
git fetch --all
git checkout <release-branch-or-tag>
git pull --ff-only
npm ci
npm run build
# fresh 环境或需要重建初始化时：
# npm run init:system
pm2 start ecosystem.config.js --env production || pm2 restart ecosystem.config.js --env production
pm2 save
```

### 7.2 发布后检查

- 打开 `/`
- 打开 `/approval`
- 打开 `/project-contracts`
- 检查附件上传接口 `/api/upload`
- 检查钉钉登录回调是否正常

## 8. 回滚步骤

如果发布后发现严重问题，按下面最小步骤回滚：

```bash
git log --oneline -n 5
git checkout <last-known-good-commit>
npm ci
npm run build
pm2 restart ecosystem.config.js --env production
pm2 save
```

数据库回滚原则：

- 当前仓库没有通用自动回滚脚本。
- 发布前必须先做数据库备份。
- 如数据库结构或种子数据已变更，按备份恢复，不要临时手工逆向修改生产库。

## 9. 当前已知限制

- `prisma migrate deploy` 还不是空库可直接执行的全库建库方案。
- 初始化脚本已收口到 `npm run init:system`，但仍依赖关键审批人已先存在于 `SystemUser`。
- `payment-apply` 与 `construction-approvals` 已明确排除在第一批正式替换范围之外，后续如需上线，需先补到成熟台账页水位。
