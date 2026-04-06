# 统一初始化 Runbook

本文件定义 fresh 环境首次初始化的唯一推荐入口。

## 1. 目标

把以下初始化收成一条明确链路：

- 基础 seed
- 默认区域
- 施工立项表单定义
- 审批流程定义
- 首个系统管理员 bootstrap
- 关键审批人存在性检查

说明：

- 统一初始化仍会创建 `construction-approvals` 所需表单定义，因为它属于系统现有模块依赖。
- 但 `construction-approvals` 与 `payment-apply` 都不在第一批正式替换氚云上线范围，正式上线口径以 [docs/production-runbook.md](/Users/a1/.cursor/worktrees/project-manager/kai/docs/production-runbook.md) 为准。

## 2. 必须先准备的环境变量

初始化前至少先配好：

- `DATABASE_URL`
- `BOOTSTRAP_ADMIN_DING_USER_ID`
- `BOOTSTRAP_ADMIN_NAME`
- `SYSTEM_MANAGER_DING_USER_IDS`
- `NEXT_PUBLIC_SYSTEM_MANAGER_DING_USER_IDS`

建议同时提前配好生产运行时必需的 DingTalk / OSS 变量，保持与 `.env.example` 一致。

## 3. 首个系统管理员 bootstrap

如果数据库里还没有任何 `ADMIN` 角色用户：

- `npm run init:system` 会读取：
  - `BOOTSTRAP_ADMIN_DING_USER_ID`
  - `BOOTSTRAP_ADMIN_NAME`
  - `BOOTSTRAP_ADMIN_MOBILE`（可选）
- 然后自动创建或升级这条 `SystemUser` 为 `ADMIN`

如果数据库里已经存在启用中的 `ADMIN`：

- 初始化不会重复创建管理员
- 会直接沿用现有管理员

## 4. 关键审批人前置条件

初始化审批流程前，系统会强校验以下人员是否已经存在于 `SystemUser` 且为启用状态：

- 马建波
- 牟晓山
- 马玉杰
- 马亚笑
- 卢海霞

若缺少任一人：

- 初始化会直接失败
- 不再静默降级成 `ADMIN` 审批

## 5. 统一初始化入口

执行：

```bash
npm run init:system
```

这条命令会按顺序执行：

1. 首个系统管理员 bootstrap
2. `prisma/seed.js` 基础 seed
3. 默认区域创建与旧数据 `regionId` 回填
4. `construction-approvals` 表单定义初始化
5. 关键审批人检查
6. 审批流程定义初始化

## 6. fresh 环境首次初始化顺序

推荐完整顺序：

```bash
cp .env.example .env.production
# 补齐 DATABASE_URL、管理员、系统管理员白名单等变量

npm ci
npx prisma generate
npm run init:system
npm run build
```

## 7. 初始化成功后最小验证

至少验证下面几项：

- 能用 bootstrap 管理员登录系统
- `/system-users` 可打开
- `/process-definitions` 有流程定义
- `/form-definitions` 里能看到 `construction-approvals`
- `/regions` 里存在 `DEFAULT`
- `/approval` 能正常打开

## 8. 当前限制

- 关键审批人仍依赖真实 `SystemUser` 数据先存在
- 统一初始化已经收口，但数据库基线问题仍属于生产上线 runbook 的 A 包范围
