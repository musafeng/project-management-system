# UX 改造阶段总结

> 生成时间：2026-05-17
> 适用范围：staging/claude-handover-ux-dingtalk 分支前端 UX 改造（钉钉移动端 + PC 双端）

---

## 1. 当前分支

- 工作分支：`staging/claude-handover-ux-dingtalk`
- 与 `main` 关系：领先 main 若干提交，**未合并**，待用户本地+灰度回归后再决定
- 远程：`origin/staging/claude-handover-ux-dingtalk`，已与本地同步
- 平行存在的 `fix/launch-finalize` 分支差异巨大（落后 main 33、独立 6），**禁止盲合**

---

## 2. 已完成提交列表（按时间正序）

| 提交号 | 标题 | 范围 |
| --- | --- | --- |
| `1536b85` | docs: add frontend UX batch refactor plan | 改造方案文档 |
| `8890f3c` | feat(ux): use fullscreen mobile drawer for business modals | Batch 1：业务弹窗全屏化（ResponsiveModalDrawer） |
| `5021355` | refactor(ux): batch 2 unify contract ledger pages | Batch 2：3 张合同台账统一到 project-contracts 体验基线 |

> 三个提交的祖先链没有强推、没有 reset，历史可追溯。

---

## 3. 已完成改造范围

### Batch 1（已上线候选）：业务弹窗全屏化

- 引入 `components/ResponsiveModalDrawer.tsx`：PC 端走 antd `Modal`，手机端走 antd `Drawer placement="bottom" height="100dvh"`，含 `100vh` 兜底与 `env(safe-area-inset-bottom)` 兼容
- 已替换的弹窗（涉及业务表单）保持 children、提交逻辑、API 不变
- 烟测确认：PC、手机端均无回归

### Batch 2（待用户本地回归）：3 张合同台账统一

涉及文件：
- `app/procurement-contracts/page.tsx`
- `app/labor-contracts/page.tsx`
- `app/subcontract-contracts/page.tsx`

统一项：
- 容器：`LedgerPageLayout` + `FilterBar` + `MobileCardList` + `EmptyHint`
- 弹窗：`ResponsiveModalDrawer`（PC=Modal / 手机=全屏 Drawer）
- 表单：`validateMessages={DEFAULT_FORM_VALIDATE_MESSAGES}` + `onFinishFailed` 提示
- 数据请求：`requestApi` 取代裸 `fetch`；`fmtMoney`/`fmtDate` 统一格式化
- 筛选：「关键词 + 项目下拉 + 签订日期范围」（与 project-contracts 一致），原 `month=YYYY-MM` 改为前端 `dateRange` 客户端过滤
- 手机端卡片：合同名称 / 合同编号 / 项目 / 对手方 / 合同金额 / 已付 / 未付 / 状态 / 签订日期，分页 `MOBILE_PAGE_SIZE = 20`
- 删除权限：统一 `isSystemManagerClientUser`（采购页之前是 raw role 比较，已对齐）
- `applyClientFilters` 提到模块作用域，避免 useEffect 闭包警告

未改：API、金额计算、审批逻辑、登录/权限、附件上传、Prisma schema、deploy-server.sh。

本地检查：
- `npx tsc --noEmit` 通过
- `npm run lint` 通过（无 warning / error）

---

## 4. 服务器事故结论

**结论：以后不要在低配生产服务器跑 staging build。**

事故脉络：
- 在生产服务器上直接 `next build` 时，构建过程把整台机器内存吃满
- 触发 OOM Killer，连同 sshd 进程一起被杀
- 远程 SSH 失联，需要在控制台/带外通道恢复

后果与原则：
1. 生产服务器是低配、跑着真实业务，不是构建机
2. 构建必须在本地或独立 CI 环境完成，产物再分发到生产
3. `scripts/deploy-server.sh` 当前的「多版本发布目录 + 健康检查失败自动回滚」模型保留，**不要改**
4. 未来即使要在服务器上跑迁移、回放、补数等动作，先做内存预算，且单独窗口、避开高峰，**不要叠加 build**

---

## 5. 当前禁止事项（直到用户解除）

- ❌ 不连接生产服务器（无论 SSH、SCP、还是任何 deploy 脚本）
- ❌ 不部署
- ❌ 不改数据库 / 不动 `prisma/schema.prisma` / 不跑任何 `prisma migrate` 或 `db push`
- ❌ 不改 API（路由、入参、出参、权限校验）
- ❌ 不改金额计算逻辑
- ❌ 不改审批核心逻辑（`lib/approval.ts`、`app/api/approval/*`、各业务表审批节点）
- ❌ 不改登录与会话（`lib/auth-client.ts`、钉钉免登）
- ❌ 不改附件上传（`AttachmentUploadField`、`/api/upload`、签名链接）
- ❌ 不改 `scripts/deploy-server.sh`
- ❌ 不安装新 npm 依赖、不装第三方 MCP / hooks
- ❌ 不在生产服务器跑 build
- ❌ 不强推 / 不 reset / 不删分支
- ❌ 不直接改 `main`
- ❌ 不自动启动 Batch 3，必须等用户明确指令

---

## 6. 下一批候选页面

按「移动端使用频次 × 体验差距」排序的候选清单（仅候选，启动前必须用户确认）：

### 优先级 A（与已改 4 张台账强相关）

- `app/project-payments/page.tsx`（项目付款）
- `app/project-receipts/page.tsx`（项目收款）
- `app/contract-receipts/page.tsx`（合同收款）
- `app/subcontract-payments/page.tsx`（分包付款）
- `app/labor-payments/page.tsx`（劳务付款）
- `app/procurement-payments/page.tsx`（采购付款）

> 共同特征：都是台账 + 弹窗 + 审批 + 金额，模式与 Batch 2 高度一致，可复用同一套组件骨架。

### 优先级 B（涉及金额汇总、审批节点）

- `app/management-expenses/page.tsx`（管理费用）
- `app/other-payments/page.tsx`（其他付款）
- `app/projects/page.tsx`（项目台账主入口）
- `app/construction-approvals/page.tsx`（施工立项审批）

### 优先级 C（基础档案，已部分改造过，需要核对）

- `app/customers/page.tsx`
- `app/suppliers/page.tsx`
- `app/labor-workers/page.tsx`

> Batch 7 已对部分档案页做过移动端改造，启动前需要 diff 看是否还需要再次对齐。

---

## 7. Batch 3 启动前检查清单

启动 Batch 3 之前，必须：

1. **用户明确点头启动 Batch 3**，并指定本批要改的具体页面（不要 AI 自选）
2. 拉最新分支：`git fetch origin && git rebase origin/staging/claude-handover-ux-dingtalk`（或 fast-forward）
3. 确认 Batch 1 + Batch 2 已经在用户侧（本地、钉钉灰度）回归通过；如有回退需求，先回退再启动新批次
4. 复读 `CLAUDE.md`、`UX_REFACTOR_STAGE_SUMMARY.md`、`FRONTEND_UX_BATCH_REFACTOR_PLAN.md`
5. 对要改的每个页面执行：
   - 先读、再列改造点、再动手
   - 改造点必须显式说明：是否影响 API / 审批 / 金额 / 权限 / 附件
   - 最小化改动半径，不顺手清理周边代码
6. 改完执行：
   - `npx tsc --noEmit`
   - `npm run lint`
   - 必要时 `npm run build:server`（如果只是页面 UX 改造可省，但任何 import 路径或共享组件改动必须跑构建）
7. 提交粒度：**一批一个 commit**，commit message 走 `refactor(ux): batch N ...` 模板
8. 不自动推送、不自动合并、**不提交未授权的文件**
9. 用户本地回归 → 用户授权 → 才推送
10. 推送只推到 `staging/claude-handover-ux-dingtalk`，不推 `main`

---

## 8. 换会话时 Claude 应优先读取的文件

新的会话首次接手本项目 UX 改造时，按顺序读：

1. `CLAUDE.md` —— 项目长期规则（最高优先级）
2. `UX_REFACTOR_STAGE_SUMMARY.md` —— 本文件，了解当前阶段在哪
3. `FRONTEND_UX_BATCH_REFACTOR_PLAN.md` —— 改造方案与节奏
4. `GIT_BRANCH_HANDOVER_AUDIT.md` —— 分支审计与历史背景
5. `app/project-contracts/page.tsx` —— Batch 2 的体验基线，写新页面前对照这一份
6. `components/ResponsiveModalDrawer.tsx` —— 移动端全屏弹窗封装
7. `components/ledger/*` —— `LedgerPageLayout` / `FilterBar` / `MobileCardList` / `EmptyHint`
8. `lib/client-request.ts` —— `requestApi` 包装，所有页面统一走它
9. `lib/approval-status.ts` —— 审批锁判断
10. `hooks/useMobile.ts` —— 768px 断点判断

读完之后再决定动手；**未读完之前不要写代码**，更不要发起任何破坏性命令。

---

## 9. 关键链接锚

- 业务核心 5 大不可破坏能力（详见 `CLAUDE.md` 第四节）：审批流 / 收付款 / 附件 / 登录会话 / 权限区域隔离
- 部署模型：本地构建 → 多版本发布目录 → 健康检查失败自动回滚
- 钉钉相关：`lib/dingtalk.ts`、`lib/dingtalk-notify.ts`，改之前先评估免登 / 待办 / 催办 / access_token 的影响

---

> 本文件由当前会话生成，仅作为阶段交接快照。任何与代码现状冲突的描述，**以代码现状为准**。
