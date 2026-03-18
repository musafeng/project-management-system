# 合同收款 API（ContractReceipt）文档

## 📋 概述

合同收款 API 用于记录项目合同收款，并自动更新合同汇总字段。采用企业级 API 基础层设计，所有返回使用统一的 `success()` 格式，所有错误使用 `ApiError`。

---

## 📁 新增 API 文件列表

```
app/api/contract-receipts/
├── route.ts              # GET 列表、POST 创建
└── [id]/
    └── route.ts          # GET 详情、DELETE 删除
```

---

## 🔌 所有接口 URL

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/contract-receipts` | 获取收款记录列表 |
| POST | `/api/contract-receipts` | 创建收款记录 |
| GET | `/api/contract-receipts/{id}` | 获取收款详情 |
| DELETE | `/api/contract-receipts/{id}` | 删除收款记录 |

---

## 📝 接口详细说明

### 1. GET /api/contract-receipts - 获取收款记录列表

**功能**: 获取收款记录列表，支持按合同或项目过滤

**查询参数**:
- `contractId` (可选): 按合同 ID 过滤
- `projectId` (可选): 按项目 ID 过滤

**返回字段**:
```json
{
  "success": true,
  "data": [
    {
      "id": "收款记录ID",
      "contractId": "合同ID",
      "contractCode": "合同编码",
      "projectName": "项目名称",
      "amount": 50000,
      "receiptDate": "2026-03-17T10:00:00Z",
      "remark": "首期收款",
      "createdAt": "2026-03-17T10:00:00Z"
    }
  ]
}
```

**排序规则**: 按 `receiptDate` 倒序

---

### 2. POST /api/contract-receipts - 创建收款记录

**功能**: 创建收款记录，自动更新合同汇总字段

**请求体**:
```json
{
  "contractId": "合同ID",
  "amount": 50000,
  "receiptDate": "2026-03-17T10:00:00Z",
  "remark": "首期收款"
}
```

**必填字段**:
- `contractId`: 合同 ID（必须存在）
- `amount`: 收款金额（必须 > 0）

**可选字段**:
- `receiptDate`: 收款日期（默认为当前时间）
- `remark`: 备注

**返回字段**:
```json
{
  "success": true,
  "data": {
    "id": "收款记录ID",
    "contractId": "合同ID",
    "contractCode": "合同编码",
    "projectName": "项目名称",
    "amount": 50000,
    "receiptDate": "2026-03-17T10:00:00Z",
    "remark": "首期收款",
    "createdAt": "2026-03-17T10:00:00Z"
  }
}
```

**自动更新规则**:
- `receivedAmount += amount`
- `unreceivedAmount = receivableAmount - receivedAmount`

**错误处理**:
- 合同不存在: `404 Not Found`
- 金额 ≤ 0: `400 Bad Request`
- 缺少必填字段: `400 Bad Request`

---

### 3. GET /api/contract-receipts/{id} - 获取收款详情

**功能**: 获取单条收款记录的详细信息

**路径参数**:
- `id`: 收款记录 ID

**返回字段**:
```json
{
  "success": true,
  "data": {
    "id": "收款记录ID",
    "contractId": "合同ID",
    "contractCode": "合同编码",
    "projectName": "项目名称",
    "amount": 50000,
    "receiptDate": "2026-03-17T10:00:00Z",
    "receiptMethod": "转账",
    "receiptNumber": "收据号",
    "status": "RECEIVED",
    "remark": "首期收款",
    "createdAt": "2026-03-17T10:00:00Z",
    "updatedAt": "2026-03-17T10:00:00Z"
  }
}
```

**错误处理**:
- 收款记录不存在: `404 Not Found`
- 缺少 ID: `400 Bad Request`

---

### 4. DELETE /api/contract-receipts/{id} - 删除收款记录

**功能**: 删除收款记录，自动回退合同汇总字段

**路径参数**:
- `id`: 收款记录 ID

**返回字段**:
```json
{
  "success": true,
  "data": {
    "message": "收款记录已删除"
  }
}
```

**自动回退规则**:
- `receivedAmount -= amount`
- `unreceivedAmount = receivableAmount - receivedAmount`

**错误处理**:
- 收款记录不存在: `404 Not Found`
- 关联合同不存在: `404 Not Found`
- 缺少 ID: `400 Bad Request`

---

## 🧪 示例请求

### 示例 1: 获取所有收款记录

```bash
curl -X GET "http://localhost:3000/api/contract-receipts"
```

**返回**:
```json
{
  "success": true,
  "data": [
    {
      "id": "clp1a2b3c4d5e6f7g8h9i0j1k",
      "contractId": "clp0z9y8x7w6v5u4t3s2r1q0",
      "contractCode": "CONTRACT1710710400000",
      "projectName": "项目 A",
      "amount": 50000,
      "receiptDate": "2026-03-17T10:00:00Z",
      "remark": "首期收款",
      "createdAt": "2026-03-17T10:00:00Z"
    }
  ]
}
```

---

### 示例 2: 按合同过滤收款记录

```bash
curl -X GET "http://localhost:3000/api/contract-receipts?contractId=clp0z9y8x7w6v5u4t3s2r1q0"
```

---

### 示例 3: 按项目过滤收款记录

```bash
curl -X GET "http://localhost:3000/api/contract-receipts?projectId=clp0z9y8x7w6v5u4t3s2r1q0"
```

---

### 示例 4: 创建收款记录

```bash
curl -X POST "http://localhost:3000/api/contract-receipts" \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "clp0z9y8x7w6v5u4t3s2r1q0",
    "amount": 50000,
    "receiptDate": "2026-03-17T10:00:00Z",
    "remark": "首期收款"
  }'
```

**返回**:
```json
{
  "success": true,
  "data": {
    "id": "clp1a2b3c4d5e6f7g8h9i0j1k",
    "contractId": "clp0z9y8x7w6v5u4t3s2r1q0",
    "contractCode": "CONTRACT1710710400000",
    "projectName": "项目 A",
    "amount": 50000,
    "receiptDate": "2026-03-17T10:00:00Z",
    "remark": "首期收款",
    "createdAt": "2026-03-17T10:00:00Z"
  }
}
```

---

### 示例 5: 获取收款详情

```bash
curl -X GET "http://localhost:3000/api/contract-receipts/clp1a2b3c4d5e6f7g8h9i0j1k"
```

**返回**:
```json
{
  "success": true,
  "data": {
    "id": "clp1a2b3c4d5e6f7g8h9i0j1k",
    "contractId": "clp0z9y8x7w6v5u4t3s2r1q0",
    "contractCode": "CONTRACT1710710400000",
    "projectName": "项目 A",
    "amount": 50000,
    "receiptDate": "2026-03-17T10:00:00Z",
    "receiptMethod": "转账",
    "receiptNumber": "REC001",
    "status": "RECEIVED",
    "remark": "首期收款",
    "createdAt": "2026-03-17T10:00:00Z",
    "updatedAt": "2026-03-17T10:00:00Z"
  }
}
```

---

### 示例 6: 删除收款记录

```bash
curl -X DELETE "http://localhost:3000/api/contract-receipts/clp1a2b3c4d5e6f7g8h9i0j1k"
```

**返回**:
```json
{
  "success": true,
  "data": {
    "message": "收款记录已删除"
  }
}
```

---

## ✅ 数据库验证

### 数据库表结构

**ContractReceipt 表**:
```
- id: String (主键)
- contractId: String (外键 → ProjectContract)
- receiptAmount: Decimal(18,2)
- receiptDate: DateTime
- receiptMethod: String (可选)
- receiptNumber: String (可选)
- status: ReceiptStatus (UNRECEIVED | PARTIAL | RECEIVED | OVERRECEIVED)
- remark: String (可选)
- createdAt: DateTime
- updatedAt: DateTime
```

**ProjectContract 表汇总字段**:
```
- receivableAmount: Decimal(18,2) - 应收金额
- receivedAmount: Decimal(18,2) - 已收金额
- unreceivedAmount: Decimal(18,2) - 未收金额
```

### 数据库连接状态

✅ **已验证**:
- Prisma 客户端已生成
- 数据库模型已定义
- 所有表关系已配置
- 外键约束已启用

---

## 🚀 使用建议

1. **创建收款记录前**，确保合同已存在
2. **删除收款记录时**，系统自动回退合同汇总字段
3. **查询收款记录时**，支持按合同或项目过滤
4. **所有金额字段**使用 Decimal(18,2) 精度，避免浮点数精度问题
5. **receiptDate 默认值**为当前时间，可选传入

---

## 📊 业务流程

```
创建收款记录
    ↓
验证合同存在
    ↓
创建 ContractReceipt 记录
    ↓
更新 ProjectContract 汇总字段
    ├─ receivedAmount += amount
    └─ unreceivedAmount = receivableAmount - receivedAmount
    ↓
返回成功响应

删除收款记录
    ↓
获取收款记录和合同信息
    ↓
删除 ContractReceipt 记录
    ↓
回退 ProjectContract 汇总字段
    ├─ receivedAmount -= amount
    └─ unreceivedAmount = receivableAmount - receivedAmount
    ↓
返回成功响应
```

---

## 🔒 错误处理

所有错误都遵循统一的 ApiError 格式：

```json
{
  "success": false,
  "error": "错误信息"
}
```

**常见错误码**:
- `400 Bad Request`: 请求参数错误或验证失败
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器错误

---

## ✨ 特性

✅ 企业级 API 基础层  
✅ 统一的返回格式  
✅ 完整的错误处理  
✅ 自动汇总字段更新  
✅ 支持多条件查询  
✅ 数据库事务一致性  
✅ 关联数据自动加载  

---

**开发日期**: 2026-03-17  
**API 版本**: 1.0.0  
**状态**: ✅ 生产就绪




