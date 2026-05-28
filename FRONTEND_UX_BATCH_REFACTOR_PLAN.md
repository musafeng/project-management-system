# 前端体验批量改造方案（FRONTEND_UX_BATCH_REFACTOR_PLAN）

> 更新时间：2026-05-17
> 目标分支：`staging/claude-handover-ux-dingtalk`
> 本方案不改业务/数据库/审批/金额/登录/权限逻辑，只改 UI 表层。

---

## 一、当前页面分类清单（共 30 个 page.tsx）

### 1. 列表页（22 个，全部已用 `MobileCardList`，多数已含审批动作）

#### 1A. 业务台账列表（含审批，**高敏**）— 16 个
- `app/projects/page.tsx` 项目新增
- `app/project-contracts/page.tsx` 项目合同（**唯一已用 `LedgerPageLayout`**）
- `app/project-contract-changes/page.tsx` 项目合同变更
- `app/construction-approvals/page.tsx` 施工立项（**唯一用 `DynamicForm`**）
- `app/procurement-contracts/page.tsx` 采购合同
- `app/procurement-payments/page.tsx` 采购付款 ⚠️
- `app/labor-contracts/page.tsx` 劳务合同
- `app/labor-payments/page.tsx` 劳务付款 ⚠️
- `app/subcontract-contracts/page.tsx` 分包合同
- `app/subcontract-payments/page.tsx` 分包付款 ⚠️
- `app/contract-receipts/page.tsx` 合同收款 ⚠️
- `app/other-receipts/page.tsx` 其他收款 ⚠️
- `app/other-payments/page.tsx` 其他付款 ⚠️
- `app/project-expenses/page.tsx` 项目费用报销
- `app/management-expenses/page.tsx` 管理费用报销
- `app/sales-expenses/page.tsx` 销售费用报销
- `app/petty-cashes/page.tsx` 备用金申请
（⚠️ = 含金额计算 / 收付款，禁止动数据流）

#### 1B. 主数据档案列表（无审批） — 3 个
- `app/customers/page.tsx` 客户
- `app/suppliers/page.tsx` 供应商
- `app/labor-workers/page.tsx` 劳务人员

#### 1C. 系统/日志列表 — 2 个
- `app/action-logs/page.tsx` 操作日志
- `app/system-users/page.tsx` 用户管理

#### 1D. 审批中心（聚合多类型） — 1 个
- `app/approval/page.tsx` 待我审批 / 已审批 / 抄送我的 / 我发起的（4 Tab）

### 2. 表单页（独立页面，1 个）
- `app/payment-apply/page.tsx` 统一付款申请向导（Steps + Form，唯一独立表单页）

### 3. 详情页（**当前架构无独立详情路由**）
- 详情通过 `BusinessRecordDetailModal` / 自建 Modal / `ViewRecordButton` 弹层展示
- 没有 `app/<resource>/[id]/page.tsx` 这种独立详情页

### 4. 仪表盘 / 配置 / 工具 — 6 个（不在本轮范围）
- `app/page.tsx` 工作台首页
- `app/financial-summary/page.tsx` 财务汇总
- `app/regions/page.tsx` `app/org-units/page.tsx` 组织/区域
- `app/process-definitions/page.tsx` `app/form-definitions/page.tsx` 流程/表单配置
- `app/data-exports/page.tsx` 数据下载中心

---

## 二、哪些页面共用同一种模板

| 模板 | 适用页面 | 当前共用部件 |
|---|---|---|
| **业务台账列表 + 弹窗式新建/编辑/详情** | 1A 全部 16 个 | `MobileCardList` + `Table` + `Form Modal` + `ApprovalActions` + `ViewRecordButton` |
| **主数据档案列表** | 1B 全部 3 个 | `MobileCardList` + `Table` + `Form Modal`（无审批） |
| **系统/日志列表（只读）** | 1C 全部 2 个 | `MobileCardList` + `Table` + 筛选栏 |
| **审批聚合中心** | 1D `approval` 1 个 | 4 Tab + `MobileCardList` + 审批操作 Modal |
| **向导式表单页** | 2 `payment-apply` 1 个 | `Steps` + `Form` 多步 |

**结论**：1A 16 页结构高度同构，但目前**只有 1 页用了 `LedgerPageLayout`**，其余 15 页是各自手搓相同布局。这是批量改造最大的杠杆点。

---

## 三、风险分级

### 🔴 高风险（绝不批量改，逐页独立 PR + 人工回归）
- `app/contract-receipts/page.tsx` 收款金额计算
- `app/procurement-payments/page.tsx` `app/labor-payments/page.tsx` `app/subcontract-payments/page.tsx` 付款金额
- `app/other-receipts/page.tsx` `app/other-payments/page.tsx`
- `app/petty-cashes/page.tsx` 备用金（金额 + 退回联动）
- `app/project-contract-changes/page.tsx` 合同变更（影响合同应收）
- `app/approval/page.tsx` 审批操作（同意/驳回/撤回/催办，链路核心）

### 🟡 中风险（可批量改 UI 壳，不动金额/审批数据流）
- `app/projects/page.tsx` 项目新增
- `app/project-contracts/page.tsx` 项目合同（已用 `LedgerPageLayout`，做基线）
- `app/procurement-contracts/page.tsx` 采购合同
- `app/labor-contracts/page.tsx` 劳务合同
- `app/subcontract-contracts/page.tsx` 分包合同
- `app/construction-approvals/page.tsx` 施工立项
- `app/project-expenses/page.tsx` `management-expenses` `sales-expenses` 报销

### 🟢 低风险（可较自由改 UI）
- `app/customers/page.tsx` `app/suppliers/page.tsx` `app/labor-workers/page.tsx` 主数据
- `app/action-logs/page.tsx` `app/system-users/page.tsx` 系统类

---

## 四、第一批批量改造（不超过 3 个页面）

按用户意图，先做**模板代表页**：

| # | 页面 | 风险 | 代表性 |
|---|---|---|---|
| 1 | `app/approval/page.tsx` 审批中心 | 🔴 | 唯一审批聚合页，UI 改造模板 |
| 2 | `app/projects/page.tsx` 项目列表 | 🟡 | 主数据 + 审批的简单结构，最干净的样板 |
| 3 | `app/project-contracts/page.tsx` 项目合同 | 🟡 | 已用 `LedgerPageLayout`，作为完成态参照 |

**原则**：
- 第 1 批**只动 UI 壳**：布局、间距、字号、触控区、筛选栏样式、卡片视觉、空状态。
- 不动：审批数据流、金额计算、列定义中的字段映射、API 调用、表单 schema、附件上传、权限分支。
- 第 1 批做完，新增/抽出的通用组件就是后续批次的骨架。

---

## 五、需要抽的通用组件

### 5A. 已存在 / 直接复用（不新建）

| 组件 | 路径 | 当前覆盖 | 说明 |
|---|---|---|---|
| `LedgerPageLayout` | `components/ledger/LedgerPageLayout.tsx` | 1/22 | 已具备移动/PC 双布局，应推广 |
| `FilterBar` | `components/ledger/FilterBar.tsx` | — | 已含 input/select/dateRange，移动端竖排 |
| `MobileCardList` | `components/ledger/MobileCardList.tsx` | 22/22 | 移动卡片基座，成熟 |
| `StatusTag` + 4 套 status map | `components/ledger/StatusTag.tsx` | — | 合同/审批/项目/付款状态色 |
| `EmptyHint` | `components/ledger/EmptyHint.tsx` | — | 空状态 |
| `ApprovalActions` `ApprovalStatusTag` | `components/ApprovalActions.tsx` | 17 页 | 审批操作 + 状态徽章 |
| `BusinessRecordDetailModal` | `components/BusinessRecordDetailModal.tsx` | — | 通用详情弹窗 |
| `DynamicForm` | `components/DynamicForm.tsx` | 1 页 | 通用动态表单（仅施工立项用） |
| `AmountSummaryCards` | `components/AmountSummaryCards.tsx` | — | 金额汇总卡 |
| `AttachmentUploadField` `AttachmentPreviewLinks` | `components/Attachment*.tsx` | — | 附件上传/预览 |
| `ViewRecordButton` | `components/ViewRecordButton.tsx` | — | 查看记录入口 |
| `useMobile` | `hooks/useMobile.tsx` | — | 768px 断点 hook |
| `fmtMoney` `fmtDate` | `lib/utils/format.ts` | — | 金额/日期格式化（替代 `AmountText`） |

### 5B. 第一批拟新增（最小必要，仅在第一批完成后视实际收益决定是否提交）

| 候选组件 | 触发条件 | 备注 |
|---|---|---|
| `MobileFilterDrawer` | 多筛选字段在手机端塞不下时 | 作为 `FilterBar` 的手机端折叠版（可选） |
| `StickyBottomActionBar` | 详情/表单弹窗手机端按钮被键盘挡住时 | 仅手机端使用 |
| `ApprovalTimeline` | 审批详情想要时间线视图时 | 当前是 `Steps`，看实际反馈再定 |
| `AttachmentPanel` | 想统一附件区视觉时 | 包装现有 upload + preview 两个组件 |

> **不在本轮新建**的（用户清单中提到但不必要）：
> - `ResponsivePage` → 用 `LedgerPageLayout` 推广已足够
> - `ResponsiveList` → `LedgerPageLayout` + `MobileCardList` 已实现
> - `MobileRecordCard` → `MobileCardList` 内部已是卡片
> - `DesktopTableWrapper` → 直接用 antd `Table`，无须再包
> - `FormSection` → antd `Form` + `Divider` 已能表达分节，过度抽象
> - `DetailSection` → `Descriptions` 已能表达
> - `StatusTag` → 已存在
> - `AmountText` → `fmtMoney` 工具足够，不需要组件

---

## 六、每类页面的手机端标准样式（统一规范）

### 6.1 通用规范
- **断点**：`useMobile()` 768px。
- **字号**：手机端正文 14px、辅助 12px、标题 16-18px。
- **触控区**：可点击行 `min-height: 44-56px`。
- **圆角**：卡片 12px、按钮 6-8px。
- **阴影**：`0 1-2px 6-10px rgba(0,0,0,0.05-0.07)`，禁用大投影。
- **间距**：外层 padding 14px，区块 marginBottom 12-16px，紧凑信息行 gap 6-8px。
- **颜色**：主色 `#1677ff`、危险 `#ff4d4f`、警告 `#fa8c16`、成功 `#52c41a`、文字主 `#1d1d1f`、次 `#8c8c8c`、分隔 `#f0f0f0`。

### 6.2 列表页（1A/1B/1C）
- 顶部 `LedgerPageLayout` 页眉：标题 + 总条数 + 主操作（手机端 `block`）。
- `FilterBar`：手机端字段竖排、按钮全宽（已实现）。
- 内容：手机用 `MobileCardList`（grid + Card），PC 用 `Table`。
- 空状态：`EmptyHint`，不要任何"暂无数据"裸字。
- 表格右侧操作列在手机端必须收到卡片底部 actions 区（已是默认）。

### 6.3 审批中心（1D）
- 4 Tab 顶部贴顶（手机端 sticky 可选）。
- 每条用 `MobileCardList`：左色块/标签 + 中标题（资源类型 + 提交人）+ 右状态。
- 详情/审批操作在手机端走全屏 Modal 或 Drawer，不能用窄 Modal 挤压。
- "同意/驳回/撤回/催办"按钮排成横向，最小 40px 高度。

### 6.4 表单页（payment-apply 类向导）
- `Steps` 在手机端用 `direction="vertical"` 或 `size="small"` + 紧凑标签。
- 字段单列竖排，标签上文字下输入。
- 底部"上一步/下一步"全宽按钮，可考虑 `StickyBottomActionBar`。

### 6.5 详情/编辑 Modal
- 手机端 Modal `width="100%" + style={{ top: 0, padding: 0 }}` 或改 Drawer (`placement="bottom" height="92vh"`)。
- 表单字段单列、标签上方。
- 底部确认/取消按钮全宽。

---

## 七、每类页面的 PC 端保留规则

- **PC 列表**：保留 `Table` + 多列 + 紧凑筛选（小尺寸控件）+ 横向操作列。**不要**把 PC 也变卡片。
- **PC 表单 Modal**：保留两列布局（用 `Form` 的 `labelCol/wrapperCol` 或 `Row/Col`），PC 用户期望一屏看完所有字段。
- **PC 审批中心**：保留 Table 视图，每行末尾审批按钮一字排开。
- **PC 间距**：外层 `padding: 16px 24px`、卡片 12-14px 圆角、原 `LedgerPageLayout` 已正确。
- **PC 字号**：保持 antd 默认 14px / Title level=4，不放大。
- **PC 主操作**：右上角 `+ 新增` 单按钮（不全宽）。

---

## 八、分批计划

| 批次 | 范围 | 页数 | 目的 | 抽组件许可 |
|---|---|---|---|---|
| **Batch 1（本次后下一步）** | `approval` + `projects` + `project-contracts` | 3 | 验证模板 + 收敛通用样式 | 仅在 5B 出现实际重复时新建 |
| Batch 2 | `procurement-contracts` + `labor-contracts` + `subcontract-contracts` + `construction-approvals` | 4 | 复制 Batch 1 模板到合同类（无金额风险） | 不新增组件 |
| Batch 3 | `customers` + `suppliers` + `labor-workers` | 3 | 主数据，无审批，最低风险 | 不新增组件 |
| Batch 4 ⚠️ | `contract-receipts` + `other-receipts` | 2 | **金额敏感**，严格只动 UI 壳，逐页 PR | 不新增组件 |
| Batch 5 ⚠️ | `procurement-payments` + `labor-payments` + `subcontract-payments` + `other-payments` | 4 | **金额敏感**，逐页 PR | 不新增组件 |
| Batch 6 ⚠️ | `petty-cashes` + `project-contract-changes` | 2 | 金额联动 + 变更逻辑 | 不新增组件 |
| Batch 7 | `project-expenses` + `management-expenses` + `sales-expenses` | 3 | 报销系列 | 不新增组件 |
| Batch 8 | `payment-apply` | 1 | 唯一向导式表单 | 可能用 `StickyBottomActionBar` |
| Batch 9 | `action-logs` + `system-users` | 2 | 收尾 | 不新增组件 |

**总计**：24 个改造页面（首页 / 财务汇总 / 配置 / 数据下载 5 页本轮不动）。

---

## 九、每批最多页数 + 验证

- **每批最多页数**：批 1 = 3，批 2/5 = 4，其他 ≤ 3。
- **批内并行**：单批所有页面在一个分支上跑，不再拆子分支。
- **批内验证**：
  1. `npx prisma generate`
  2. `npx tsc --noEmit`
  3. `npm run lint`
  4. `npm run build:server`（**关键，类型链路 + 构建必须过**）
  5. 本地 `npm run dev`：手机模拟（375×812）+ PC（1440 宽）双视图打开每个改造页面
  6. 手工冒烟：列表加载、新建表单打开、查询筛选、查看详情、审批入口
  7. **金额/审批/附件/登录/权限五条核心红线**：每批必须人工逐项确认未触碰
- **批间验证**（只在 Batch 4/5/6 这三批金额敏感批之前做）：
  1. 用样板数据本地复跑一次"申请→审批→金额回算"链路
  2. PC 端查询、导出按钮回归

**验证未过 = 不算完成 = 不进下一批。**

---

## 十、本方案不做的事（约束清单）

- ❌ 不连接服务器、不部署、不远程命令
- ❌ 不改 `prisma/schema.prisma`、不改 migrations、不跑 `prisma db push`
- ❌ 不改 `app/api/**`、不改 `lib/approval*.ts`、不改 `lib/auth*.ts`、不改 `lib/api/permissions.ts`
- ❌ 不改金额公式、不改收付款联动逻辑
- ❌ 不安装新 npm 依赖、不安装第三方 MCP / hook
- ❌ 不批量改全 24 页，必须分批 + 验证 + 人工冒烟
- ❌ 单批 PR 不允许跨业务领域混合（不要把"项目+收款"放同一批）

---

## 十一、Batch 1 落地清单（待用户确认后启动）

下一步动作（**不在本任务执行，等用户点头**）：

1. 在 `staging/claude-handover-ux-dingtalk` 上直接改这 3 个文件：
   - `app/approval/page.tsx`
   - `app/projects/page.tsx`
   - `app/project-contracts/page.tsx`（基线对照，主要是验证 `LedgerPageLayout` 是否需要补一些 token）
2. 不抽新组件（除非确实出现 ≥3 处一字不差的 JSX 重复）
3. 完成后跑 6 节验证清单 + 列出每页改了什么 + 怎么本地查看

---

