# 人工测试问题映射与根因清单

更新时间：2026-04-19

说明：
- 本清单严格对应当前人工测试反馈，先做“页面 -> 操作 -> API -> 根因 -> 是否影响流程”的映射。
- 当前阶段不直接改代码，只做定位与修复分批依据。
- “已确认”表示已通过代码和数据库现状核实；“待复现”表示当前源码存在疑点，但还需要结合运行日志或部署环境再确认。

---

## 进展记录（2026-04-19 第二轮）

- 已完成第一批低风险修复：
  1. `分包付款` 列表 / 详情 / 新增接口已兼容真实库缺失 `SubcontractPayment.workerId` 的情况；
  2. `assertSubcontractContractInCurrentRegion()` 已改为按真实库列动态选择，避免因 `SubcontractContract.workerId` 缺失导致直接查询报错；
  3. `项目合同变更`、`采购/劳务/分包合同`、`采购/劳务/分包付款`、`施工立项` 的审批动作路由已统一接入中文错误转换；
  4. 多个业务页面的“导出数据”入口已从 `window.open(..., '_blank')` 改为当前页跳转；
  5. `分包付款` 页面已补上缺失的“导出数据”按钮。

- 已完成静态校验：
  - `npm test` 通过
  - `npm run lint` 通过
  - `npm run build` 通过

- 已完成真实库“回滚式试写”验证：
  - `OtherReceipt`
  - `OtherPayment`
  - `ManagementExpense`
  - `SalesExpense`
  - `PettyCash`
  - `ProcurementPayment`
  - `LaborPayment`
  - 以上表在当前仓库代码对应的写入结构下，均可对真实数据库完成插入，不会稳定复现“数据库操作失败”。

- 阶段结论更新：
  - `分包付款` 的确定性兼容缺陷已修复；
  - `其他收款 / 其他付款 / 管理费用 / 销售费用 / 备用金 / 采购付款 / 劳务付款` 这组“数据库操作失败”在当前仓库 + 当前真实库结构下未能复现，更像是部署版本漂移、运行环境差异或测试环境仍在跑旧代码。

---

## 一、当前人工测试问题映射

### 1. 所有表单内多 PDF 附件上传失败

#### 现象
- 一次选择多个 PDF 后，页面顶部持续提示“操作失败、请稍候再试”。

#### 涉及页面
- `项目合同变更`
- `合同收款`
- `采购付款`
- `劳务付款`
- `分包付款`
- `其他收款`
- `其他付款`
- `管理费用报销`
- `销售费用报销`
- `备用金申请`
- 以及所有复用 [`components/AttachmentUploadField.tsx`](../components/AttachmentUploadField.tsx) 的页面

#### 关键链路
- 前端组件：[`components/AttachmentUploadField.tsx`](../components/AttachmentUploadField.tsx)
- 上传接口：[`app/api/upload/route.ts`](../app/api/upload/route.ts)

#### 当前判断
- **已确认**：所有表单都复用了同一个附件上传组件，因此这是一个“公共链路问题”，不是单页面问题。
- **已确认**：当前本地运行态测试里，上传接口会在 OSS 环境变量缺失时直接返回中文配置错误，不会落成泛化“数据库操作失败”。
- **待复现**：从源码看，多文件上传是串行队列上传，没有明显的前端并发覆盖 bug；失败更可能来自：
  1. 上传接口真实返回了后端错误；
  2. 钉钉/移动端环境对多文件选择或请求有兼容问题；
  3. 上传接口报错被统一翻译成泛化提示，导致页面看起来都是“操作失败，请稍后重试”。

#### 是否影响既定业务流程
- **不会改变流程**。
- 修复范围应只落在上传组件和上传接口，不应影响审批、台账或表单制度。

---

### 2. 项目合同变更新增后显示“待提交”，点击“提交审批”报英文；合同金额未变化

#### 现象
- 新增后列表显示“待提交”。
- 点击“提交审批”时，页面出现英文报错，无法继续。
- 原合同金额没有更新。

#### 涉及页面
- 页面：[`app/project-contract-changes/page.tsx`](../app/project-contract-changes/page.tsx)
- 审批动作组件：[`components/ApprovalActions.tsx`](../components/ApprovalActions.tsx)

#### 关键链路
- 新增接口：[`app/api/project-contract-changes/route.ts`](../app/api/project-contract-changes/route.ts)
- 提交/审批接口：[`app/api/project-contract-changes/[id]/[action]/route.ts`](../app/api/project-contract-changes/%5Bid%5D/%5Baction%5D/route.ts)
- 创建逻辑：[`lib/project-contract-changes.ts`](../lib/project-contract-changes.ts)

#### 当前判断
- **已确认**：当前实现使用了“伪草稿状态”。
  - 创建时直接写入 `approvalStatus = 'APPROVED'`
  - 前端再把“`APPROVED` 且 `approvedAt` 为空”渲染成“待提交”
  - 位置：[`lib/project-contract-changes.ts`](../lib/project-contract-changes.ts)
- **已确认**：合同金额不是“提交审批成功后”变更，而是“最终审批通过后”才回写。
  - 位置：[`app/api/project-contract-changes/[id]/[action]/route.ts`](../app/api/project-contract-changes/%5Bid%5D/%5Baction%5D/route.ts)
  - 回写逻辑：[`lib/project-contract-changes.ts`](../lib/project-contract-changes.ts)
- **已确认**：提交/审批动作接口直接把底层异常文本透回前端，因此底层抛英文时，页面会直接显示英文。
- **待复现**：当前源码尚未完全定位“提交审批报英文”的具体异常点，但可以确认这是审批动作接口的错误透传问题，不是设计要求。

#### 是否影响既定业务流程
- “新增后待提交”是现有实现的显示策略，不是你的正式业务状态设计。
- “合同金额最终审批通过后更新”属于合理流程语义，**不建议改成提交即更新**。
- 真正需要修的是：
  1. 状态模型表达不清；
  2. 提交审批时的异常没有中文化；
  3. 提交流程本身要能正常跑通。

---

### 3. 其他收款、采购付款、劳务付款、分包付款、其他付款、管理费用报销、销售费用报销、备用金新增后仍报“数据库操作失败”

#### 现象
- 保存/确定后，顶部出现“数据库操作失败，请检查输入内容后重试”。

#### 统一说明
- 这类提示主要来自 [`lib/api/error-message.ts`](../lib/api/error-message.ts) 对 Prisma 运行时异常的统一翻译。
- 也就是说，页面看到这句话，通常不代表“数据库本身坏了”，而是后端跑到了 Prisma 兼容错误、缺列错误或约束错误。

#### 3.1 采购付款
- 页面：[`app/procurement-payments/page.tsx`](../app/procurement-payments/page.tsx)
- 接口：[`app/api/procurement-payments/route.ts`](../app/api/procurement-payments/route.ts)
- 当前判断：**当前仓库下待复现**
- 说明：
  - 前端 payload 与后端入参是对齐的。
  - 已对真实数据库做“回滚式试写”，当前写入结构可成功插入。
  - 当前源码未直接暴露出明显字段名不一致问题。
  - 更像是部署环境或运行版本差异导致的运行时异常。

#### 3.2 劳务付款
- 页面：[`app/labor-payments/page.tsx`](../app/labor-payments/page.tsx)
- 接口：[`app/api/labor-payments/route.ts`](../app/api/labor-payments/route.ts)
- 当前判断：**当前仓库下待复现**
- 说明：
  - 前后端字段名已对齐。
  - 已对真实数据库做“回滚式试写”，当前写入结构可成功插入。
  - 当前源码未看到明显表单字段映射错误。

#### 3.3 分包付款
- 页面：[`app/subcontract-payments/page.tsx`](../app/subcontract-payments/page.tsx)
- 接口：[`app/api/subcontract-payments/route.ts`](../app/api/subcontract-payments/route.ts)
- 当前判断：**已确认，且已修复**
- 根因：
  1. 当前代码会尝试通过 [`lib/region.ts`](../lib/region.ts) 读取 `SubcontractContract.workerId`；
  2. 真实数据库中 `SubcontractContract` **没有** `workerId` 列；
  3. 真实数据库中 `SubcontractPayment.vendorId` 是 **NOT NULL**；
  4. 当前创建路径在某些分支会只写 `workerId`、不写 `vendorId`；
  5. 当前列表/详情查询还存在对 `workerId` 的非兼容读取。
- 结论：
  - 分包付款当前是明确存在“源码模型与真实库不一致”的兼容缺陷。
  - 这项非常可能就是人工测试持续失败的稳定根因之一。

#### 3.4 其他收款
- 页面：[`app/other-receipts/page.tsx`](../app/other-receipts/page.tsx)
- 接口：[`app/api/other-receipts/route.ts`](../app/api/other-receipts/route.ts)
- 当前判断：**当前仓库下待复现**
- 说明：
  - 前端 payload 与后端字段是对齐的。
  - 已对真实数据库做“回滚式试写”，当前写入结构可成功插入。
  - 当前本地源码不足以证明这里必然失败，需结合部署日志或真实报错。

#### 3.5 其他付款
- 页面：[`app/other-payments/page.tsx`](../app/other-payments/page.tsx)
- 接口：[`app/api/other-payments/route.ts`](../app/api/other-payments/route.ts)
- 当前判断：**当前仓库下待复现**
- 说明：
  - 前端字段与后端要求已对齐。
  - 已对真实数据库做“回滚式试写”，当前写入结构可成功插入。
  - 当前源码未发现确定性的字段不一致问题。

#### 3.6 管理费用报销
- 页面：[`app/management-expenses/page.tsx`](../app/management-expenses/page.tsx)
- 接口：[`app/api/management-expenses/route.ts`](../app/api/management-expenses/route.ts)
- 当前判断：**当前仓库下待复现**
- 说明：
  - `expenseItems`、`submitter`、`projectId` 等关键字段与 API 是对齐的。
  - 已对真实数据库做“回滚式试写”，当前写入结构可成功插入。
  - 当前源码未发现保存必然失败的明显错误。

#### 3.7 销售费用报销
- 页面：[`app/sales-expenses/page.tsx`](../app/sales-expenses/page.tsx)
- 接口：[`app/api/sales-expenses/route.ts`](../app/api/sales-expenses/route.ts)
- 当前判断：**当前仓库下待复现**
- 说明：
  - 与管理费用报销同类，已对真实数据库做“回滚式试写”，当前写入结构可成功插入。
  - 当前源码未见必然失败点。

#### 3.8 备用金申请
- 页面：[`app/petty-cashes/page.tsx`](../app/petty-cashes/page.tsx)
- 接口：[`app/api/petty-cashes/route.ts`](../app/api/petty-cashes/route.ts)
- 当前判断：**当前仓库下待复现**
- 说明：
  - 当前前后端字段基本对齐。
  - 已对真实数据库做“回滚式试写”，当前写入结构可成功插入。
  - 需结合真实环境日志继续确认。

#### 这一组问题的阶段性结论
- **已确认的硬缺陷**：分包付款。
- **高概率共性方向**：
  1. 部署版本与当前源码不一致；
  2. 真实数据库结构与 Prisma 模型/查询语句存在更多漂移；
  3. 后端原始异常被统一翻译成“数据库操作失败”，掩盖了真实问题。

#### 是否影响既定业务流程
- 这一批修复本质上是“让保存动作恢复正常”，**不应该改变你的审批或业务制度**。

---

### 4. 所有表单选择项目后点击“导出数据”无反应

#### 现象
- 点击“导出数据”没有跳转、没有反馈。

#### 关键链路
- 典型页面入口：
  - [`app/procurement-payments/page.tsx`](../app/procurement-payments/page.tsx)
  - [`app/labor-payments/page.tsx`](../app/labor-payments/page.tsx)
  - [`app/other-receipts/page.tsx`](../app/other-receipts/page.tsx)
  - [`app/other-payments/page.tsx`](../app/other-payments/page.tsx)
  - [`app/management-expenses/page.tsx`](../app/management-expenses/page.tsx)
  - [`app/sales-expenses/page.tsx`](../app/sales-expenses/page.tsx)
  - [`app/petty-cashes/page.tsx`](../app/petty-cashes/page.tsx)
- 下载中心页面：[`app/data-exports/page.tsx`](../app/data-exports/page.tsx)
- 后端接口：
  - [`app/api/data-exports/preview/route.ts`](../app/api/data-exports/preview/route.ts)
  - [`app/api/data-exports/download/route.ts`](../app/api/data-exports/download/route.ts)

#### 当前判断
- **已确认**：多数页面导出按钮都是 `window.open('/data-exports?...', '_blank')`。
- **已处理**：当前仓库已改为当前页跳转，优先规避钉钉 WebView 对新窗口的拦截。
- **高概率根因**：在钉钉内嵌 WebView 或移动端环境中，新开窗口/新标签页容易被拦截，因此用户体感是“无反应”。
- **已确认**：数据下载中心当前文案和接口实现都要求“仅系统管理员可用”。
- **已确认**：`分包付款` 页面原先没有和其它页面一致的“导出数据”按钮，页面行为本身就不一致。
- **已处理**：当前仓库已补齐 `分包付款` 页面导出入口。
- **推论**：
  - 即使成功跳转，如果当前测试账号不是系统管理员，后续查询/下载也会被拦截；
  - 但你描述的是“点击无反应”，更像是前端打开方式的问题优先于权限提示问题。

#### 是否影响既定业务流程
- **不会改变流程**。
- 这里应优先修入口跳转方式和失败反馈，不必先动导出规则本身。

---

## 二、顺带排查到的高风险问题

### 0. 多个“有审批状态的模块”实际上没有审批入口
- 已接入 `ApprovalActions` 且存在 `[action]` 接口的模块：
  - `construction-approvals`
  - `project-contracts`
  - `project-contract-changes`
  - `procurement-contracts`
  - `procurement-payments`
  - `labor-contracts`
  - `labor-payments`
  - `subcontract-contracts`
  - `subcontract-payments`
- 页面上有 `approvalStatus` 但未接入 `ApprovalActions`、也未看到对应 `[action]` 接口的模块：
  - `contract-receipts`
  - `project-expenses`
  - `other-receipts`
  - `other-payments`
  - `management-expenses`
  - `sales-expenses`
  - `petty-cashes`
- 影响：
  - 这些模块即使保存成功，也不能像其他模块一样在页面内完成“提交审批 / 通过 / 驳回”；
  - 当前人工测试先聚焦保存问题，但这类模块会在后续审批联调中继续暴露。

### 1. 动态路由写权限规则失效
- 文件：[`lib/api/permissions.ts`](../lib/api/permissions.ts)
- 说明：
  - 多个规则把动态段写成字面量 `"[id]"`；
  - 真实路径如 `/api/projects/123` 不会命中；
  - 未命中规则时默认放行。
- 影响：
  - 这不是当前人工测试直接报错项，但属于必须后续收口的安全问题。

### 2. 上传接口无认证
- 文件：[`app/api/upload/route.ts`](../app/api/upload/route.ts)
- 说明：
  - 当前任何人都可以上传到 OSS。
- 影响：
  - 不一定影响当前人工测试通过率，但属于明显安全缺口。

### 3. 付款台账在创建时提前回写
- 文件：
  - [`app/api/procurement-payments/route.ts`](../app/api/procurement-payments/route.ts)
  - [`app/api/labor-payments/route.ts`](../app/api/labor-payments/route.ts)
  - [`app/api/subcontract-payments/route.ts`](../app/api/subcontract-payments/route.ts)
- 说明：
  - 当前创建付款记录时就立即更新合同 `paidAmount/unpaidAmount`；
  - 不是等最终审批通过后再更新。
- 影响：
  - 会污染合同台账和财务汇总；
  - 这是第二批“数据一致性修复”的核心问题之一。

### 4. 已通过/已驳回单据仍可再次显示“提交审批”
- 文件：[`components/ApprovalActions.tsx`](../components/ApprovalActions.tsx)
- 影响：
  - 会造成重复流程实例；
  - 不应在第一批阻塞修复里直接大改流程，但必须在第二批收口。

---

## 三、按既定顺序的执行批次

### 第一批：先修人工测试阻塞项
- [ ] 多 PDF 附件上传失败
- [ ] 项目合同变更提交审批报错
- [ ] 各表单新增失败
- [ ] 导出入口无反应

原则：
- 只修“本来应该能工作但现在没跑通”的问题；
- 不改变审批制度、不调整业务节点。

### 第二批：修数据一致性
- [ ] 项目合同变更金额联动时机
- [ ] 三类付款单的合同已付/未付联动时机
- [ ] 驳回/删除后的台账一致性
- [ ] 重复提交审批问题
- [ ] 审批状态页面与审批动作入口对齐（补齐缺失模块）

### 第三批：收安全边界
- [ ] 上传鉴权
- [ ] 动态路由权限规则
- [ ] 裸写接口权限/日志补齐

### 第四批：工程治理
- [ ] 重复错误处理逻辑整合
- [ ] 核心链路测试补齐
- [ ] 分页、日志级别、目录整理等优化

---

## 四、当前最重要的判断结论

1. 当前多数“人工测试不过”的问题，修复后**不会改变你的既定业务制度**，只是把系统恢复到应有状态。
2. 项目合同变更金额应当在“最终审批通过后”回写，不建议改成“提交审批后立即变更”。
3. 当前源码里已经可以确认存在数据库结构漂移，尤其是分包合同/分包付款链路，这说明“数据库操作失败”里至少有一部分是兼容问题，不是用户操作问题。
4. 导出“无反应”优先看前端打开方式，不应先怀疑导出服务本身。
