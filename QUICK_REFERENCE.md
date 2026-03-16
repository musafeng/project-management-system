# 合同收款 API 快速参考

## 📋 接口速查表

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/contract-receipts` | GET | 列表 |
| `/api/contract-receipts` | POST | 创建 |
| `/api/contract-receipts/{id}` | GET | 详情 |
| `/api/contract-receipts/{id}` | DELETE | 删除 |

## 🔧 快速命令

```bash
# 获取列表
curl http://localhost:3000/api/contract-receipts

# 按合同过滤
curl "http://localhost:3000/api/contract-receipts?contractId=ID"

# 按项目过滤
curl "http://localhost:3000/api/contract-receipts?projectId=ID"

# 创建收款
curl -X POST http://localhost:3000/api/contract-receipts \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "ID",
    "amount": 50000,
    "receiptDate": "2026-03-17T10:00:00Z",
    "remark": "首期收款"
  }'

# 获取详情
curl http://localhost:3000/api/contract-receipts/ID

# 删除
curl -X DELETE http://localhost:3000/api/contract-receipts/ID
```

## 📦 请求体格式

### POST 创建收款

```json
{
  "contractId": "必填",
  "amount": "必填，> 0",
  "receiptDate": "可选，默认当前时间",
  "remark": "可选"
}
```

## 📤 返回格式

### 成功

```json
{
  "success": true,
  "data": { ... }
}
```

### 失败

```json
{
  "success": false,
  "error": "错误信息"
}
```

## 🔑 关键字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 收款记录 ID |
| contractId | String | 合同 ID |
| contractCode | String | 合同编码 |
| projectName | String | 项目名称 |
| amount | Decimal | 收款金额 |
| receiptDate | DateTime | 收款日期 |
| remark | String | 备注 |
| createdAt | DateTime | 创建时间 |

## ⚙️ 自动更新规则

### 创建收款时
```
receivedAmount += amount
unreceivedAmount = receivableAmount - receivedAmount
```

### 删除收款时
```
receivedAmount -= amount
unreceivedAmount = receivableAmount - receivedAmount
```

## ❌ 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| 400 Bad Request | 缺少必填字段 | 检查 contractId 和 amount |
| 400 Bad Request | 金额 ≤ 0 | amount 必须 > 0 |
| 404 Not Found | 合同不存在 | 检查 contractId 是否正确 |
| 404 Not Found | 收款记录不存在 | 检查 ID 是否正确 |

## 📁 文件位置

```
app/api/contract-receipts/
├── route.ts              # GET 列表、POST 创建
└── [id]/route.ts         # GET 详情、DELETE 删除
```

## 🧪 测试

```bash
node test-contract-receipts.js
```

## 📚 详细文档

- `CONTRACT_RECEIPTS_API.md` - 完整 API 文档
- `DEVELOPMENT_REPORT.md` - 开发报告
- `prisma/schema.prisma` - 数据模型

---

**最后更新**: 2026-03-17
