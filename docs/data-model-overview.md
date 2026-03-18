# 工程项目管理系统 - 数据模型设计文档

## 概述

本文档详细说明了正式版数据库模型的设计，覆盖 21 个业务模块，支持完整的项目生命周期管理、合同管理、收付款管理和费用管理。

---

## 业务模块与数据表映射

| 模块 | 数据表 | 说明 |
|------|--------|------|
| 1. 客户信息 | `Customer` | 客户主数据，包含税号、银行账户等 |
| 2. 项目新增 | `Project` | 项目主数据，关联客户 |
| 3. 项目状态变更 | `ProjectStatusChange` | 项目状态变更历史记录 |
| 4. 项目合同 | `ProjectContract` | 项目合同，包含应收/已收/未收汇总字段 |
| 5. 项目合同变更 | `ProjectContractChange` | 合同变更记录（增加、减少、调整） |
| 6. 采购合同 | `ProcurementContract` | 采购合同，关联项目、施工立项、供应商 |
| 7. 劳务合同 | `LaborContract` | 劳务合同，关联项目、施工立项、劳务人员 |
| 8. 专业分包合同 | `SubcontractContract` | 分包合同，关联项目、施工立项、分包单位 |
| 9. 施工立项 | `ConstructionApproval` | 施工立项，关联项目合同 |
| 10. 供应商信息 | `Supplier` | 供应商主数据 |
| 11. 劳务人员信息 | `LaborWorker` + `SubcontractVendor` | 劳务人员（个人/班组）+ 分包单位 |
| 12. 合同收款 | `ContractReceipt` | 项目合同收款记录 |
| 13. 其他收款 | `OtherReceipt` | 非合同收款（押金、预付款等） |
| 14. 采购付款 | `ProcurementPayment` | 采购合同付款记录 |
| 15. 劳务付款 | `LaborPayment` | 劳务合同付款记录 |
| 16. 分包付款 | `SubcontractPayment` | 分包合同付款记录 |
| 17. 项目费用 | `ProjectExpense` | 项目直接费用（材料、设备等） |
| 18. 其他付款 | `OtherPayment` | 其他付款（税费、保险等） |
| 19. 备用金 | `PettyCash` | 备用金管理 |
| 20. 管理费用 | `ManagementExpense` | 项目管理费用 |
| 21. 销售/储值费用 | `SalesExpense` | 销售费用或储值费用 |

---

## 核心数据关系

### 主数据关系
```
Customer (1) ──→ (n) Project
Supplier (1) ──→ (n) ProcurementContract
LaborWorker (1) ──→ (n) LaborContract
SubcontractVendor (1) ──→ (n) SubcontractContract
```

### 项目相关关系
```
Project (1) ──→ (n) ProjectStatusChange
Project (1) ──→ (n) ProjectContract
Project (1) ──→ (n) ConstructionApproval
Project (1) ──→ (n) ProcurementContract
Project (1) ──→ (n) LaborContract
Project (1) ──→ (n) SubcontractContract
Project (1) ──→ (n) OtherReceipt
Project (1) ──→ (n) OtherPayment
Project (1) ──→ (n) ProjectExpense
Project (1) ──→ (n) ManagementExpense
Project (1) ──→ (n) SalesExpense
Project (1) ──→ (n) PettyCash
```

### 合同相关关系
```
ProjectContract (1) ──→ (n) ProjectContractChange
ProjectContract (1) ──→ (n) ContractReceipt
ProjectContract (1) ──→ (n) ConstructionApproval

ConstructionApproval (1) ──→ (n) ProcurementContract
ConstructionApproval (1) ──→ (n) LaborContract
ConstructionApproval (1) ──→ (n) SubcontractContract

ProcurementContract (1) ──→ (n) ProcurementPayment
LaborContract (1) ──→ (n) LaborPayment
SubcontractContract (1) ──→ (n) SubcontractPayment
```

---

## 关键字段设计

### 1. 项目合同汇总字段

**表：`ProjectContract`**

| 字段 | 类型 | 说明 |
|------|------|------|
| `contractAmount` | Decimal(18,2) | 合同金额 |
| `changedAmount` | Decimal(18,2) | 变更后金额（由 ProjectContractChange 累计维护） |
| `receivableAmount` | Decimal(18,2) | 应收 = contractAmount + changedAmount |
| `receivedAmount` | Decimal(18,2) | 已收（由 ContractReceipt 累计维护） |
| `unreceivedAmount` | Decimal(18,2) | 未收 = receivableAmount - receivedAmount |

**维护规则：**
- 当新增 `ProjectContractChange` 时，更新 `changedAmount`
- 当新增 `ContractReceipt` 时，更新 `receivedAmount`
- `unreceivedAmount` 由应用层计算

### 2. 采购合同汇总字段

**表：`ProcurementContract`**

| 字段 | 类型 | 说明 |
|------|------|------|
| `contractAmount` | Decimal(18,2) | 合同金额 |
| `changedAmount` | Decimal(18,2) | 变更后金额 |
| `payableAmount` | Decimal(18,2) | 应付 = contractAmount + changedAmount |
| `paidAmount` | Decimal(18,2) | 已付（由 ProcurementPayment 累计维护） |
| `unpaidAmount` | Decimal(18,2) | 未付 = payableAmount - paidAmount |

### 3. 劳务合同汇总字段

**表：`LaborContract`**

同采购合同设计

### 4. 分包合同汇总字段

**表：`SubcontractContract`**

同采购合同设计

---

## 枚举类型定义

### ProjectStatus（项目状态）
- `PLANNING` - 规划中
- `APPROVED` - 已批准
- `IN_PROGRESS` - 进行中
- `SUSPENDED` - 暂停
- `COMPLETED` - 已完成
- `CANCELLED` - 已取消

### ContractStatus（合同状态）
- `DRAFT` - 草稿
- `PENDING` - 待审批
- `APPROVED` - 已批准
- `EXECUTING` - 执行中
- `COMPLETED` - 已完成
- `TERMINATED` - 已终止
- `CANCELLED` - 已取消

### PaymentStatus（付款状态）
- `UNPAID` - 未付
- `PARTIAL` - 部分付款
- `PAID` - 已付
- `OVERPAID` - 超付

### ReceiptStatus（收款状态）
- `UNRECEIVED` - 未收
- `PARTIAL` - 部分收款
- `RECEIVED` - 已收
- `OVERRECEIVED` - 超收

### ChangeType（变更类型）
- `INCREASE` - 增加
- `DECREASE` - 减少
- `ADJUSTMENT` - 调整

### ExpenseCategory（费用类别）
- `MATERIAL` - 材料费
- `LABOR` - 劳务费
- `EQUIPMENT` - 设备费
- `SUBCONTRACT` - 分包费
- `MANAGEMENT` - 管理费
- `OTHER` - 其他

### PettyCashStatus（备用金状态）
- `ISSUED` - 已发放
- `RETURNED` - 已退回
- `PARTIAL` - 部分退回

---

## 首页汇总字段

首页需要按"项目维度"汇总以下数据：

### 项目基本信息
- `Project.name` - 项目名称
- `Project.status` - 项目状态
- `Project.code` - 项目编码

### 收入汇总
```sql
收入合计 = SUM(ContractReceipt.receiptAmount) + SUM(OtherReceipt.receiptAmount)
```

### 支出汇总
```sql
支出合计 = SUM(ProcurementPayment.paymentAmount) 
         + SUM(LaborPayment.paymentAmount) 
         + SUM(SubcontractPayment.paymentAmount) 
         + SUM(ProjectExpense.expenseAmount) 
         + SUM(OtherPayment.paymentAmount) 
         + SUM(ManagementExpense.expenseAmount) 
         + SUM(SalesExpense.expenseAmount)
```

### 利润汇总
```sql
利润 = 收入合计 - 支出合计
```

### 各类收付款统计
- 合同收款总额：`SUM(ContractReceipt.receiptAmount)`
- 其他收款总额：`SUM(OtherReceipt.receiptAmount)`
- 采购付款总额：`SUM(ProcurementPayment.paymentAmount)`
- 劳务付款总额：`SUM(LaborPayment.paymentAmount)`
- 分包付款总额：`SUM(SubcontractPayment.paymentAmount)`
- 项目费用总额：`SUM(ProjectExpense.expenseAmount)`
- 其他付款总额：`SUM(OtherPayment.paymentAmount)`
- 管理费用总额：`SUM(ManagementExpense.expenseAmount)`
- 销售费用总额：`SUM(SalesExpense.expenseAmount)`

---

## 设计原则

### 1. 主键设计
- 所有表使用 `String @id @default(cuid())` 作为主键
- 优点：分布式友好、无序列号冲突、可追溯

### 2. 金额字段
- 统一使用 `Decimal @db.Decimal(18, 2)` 类型
- 精度：18 位整数 + 2 位小数
- 避免浮点数精度问题

### 3. 时间字段
- `createdAt` - 创建时间（自动设置）
- `updatedAt` - 更新时间（自动更新）
- 业务时间字段（如 `signDate`、`receiptDate`）按业务含义命名

### 4. 外键策略
- **主业务单据**（如 Project、ProjectContract）：`onDelete: Restrict`
  - 防止误删，需要显式处理关联数据
- **历史记录**（如 ProjectStatusChange、ProjectContractChange）：`onDelete: Cascade`
  - 主记录删除时自动删除历史
- **付款/收款记录**：`onDelete: Restrict`
  - 防止误删财务数据

### 5. 索引策略
- 所有外键字段自动建立索引
- 高频查询字段（如 `code`、`status`、`date`）建立索引
- 使用 `@@index` 显式定义复合索引

### 6. 唯一性约束
- 业务编码（如 `code`）使用 `@unique`
- 确保数据一致性

### 7. 可追溯性
- 所有表包含 `remark` 字段（可空）
- 所有表包含 `createdAt` 和 `updatedAt`
- 支持完整的审计日志

---

## 与氚云的对标

本数据模型设计完全覆盖氚云工程项目管理的核心功能：

| 氚云功能 | 本系统实现 |
|---------|----------|
| 项目管理 | Project + ProjectStatusChange |
| 合同管理 | ProjectContract + ProjectContractChange |
| 收款管理 | ContractReceipt + OtherReceipt |
| 采购管理 | ProcurementContract + ProcurementPayment |
| 劳务管理 | LaborContract + LaborPayment |
| 分包管理 | SubcontractContract + SubcontractPayment |
| 费用管理 | ProjectExpense + OtherPayment + ManagementExpense + SalesExpense |
| 备用金管理 | PettyCash |
| 客户管理 | Customer |
| 供应商管理 | Supplier |
| 人员管理 | LaborWorker + SubcontractVendor |

---

## 后续扩展点

1. **权限管理**：可添加 `User` 和 `Role` 表
2. **审批流程**：可添加 `Approval` 和 `ApprovalFlow` 表
3. **附件管理**：可添加 `Attachment` 表
4. **消息通知**：可添加 `Notification` 表
5. **报表模板**：可添加 `ReportTemplate` 表
6. **数据导入导出**：可添加 `ImportLog` 和 `ExportLog` 表

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-03-17 | 初版发布，覆盖 21 个业务模块 |





