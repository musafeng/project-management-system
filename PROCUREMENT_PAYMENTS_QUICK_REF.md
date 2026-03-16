# 采购付款 API 快速参考

## 📋 接口速查表

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/procurement-payments` | GET | 列表 |
| `/api/procurement-payments` | POST | 创建 |
| `/api/procurement-payments/{id}` | GET | 详情 |
| `/api/procurement-payments/{id}` | DELETE | 删除 |

## 🔧 快速命令

```bash
# 获取列表
curl http://localhost:3000/api/procurement-payments

# 按合同过滤
curl "http://localhost:3000/api/procurement-payments?contractId=ID"

# 按项目过滤
curl "http://localhost:3000/api/procurement-payments?projectId=ID"

# 创建付款
curl -X POST http://localhost:3000/api/procurement-payments \
  -H "Content-Type: application/json" \
  -d '{
    "contractId": "ID",
    "amount": 50000,
    "paymentDate": "2026-03-17T10:00:00Z",
    "remark": "首期付款"
  }'

# 获取详情
curl http://localhost:3000/api/procurement-payments/ID

# 删除
curl -X DELETE http://localhost:3000/api/procurement-payments/ID
```

## 📦 请求体格式

### POST 创建付款

```json
{
  "contractId": "必填",
  "amount": "必填，> 0",
  "paymentDate": "可选，默认当前时间",
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
| id | String | 付款记录 ID |
| contractId | String | 合同 ID |
| contractCode | String | 合同编码 |
| projectName | String | 项目名称 |
| supplierName | String | 供应商名称 |
| amount | Decimal | 付款金额 |
| paymentDate | DateTime | 付款日期 |
| paymentMethod | String | 付款方式 |
| paymentNumber | String | 付款单号 |
| status | String | 状态 (PAID/UNPAID) |
| remark | String | 备注 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

## ❌ 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| 400 Bad Request | 缺少必填字段 | 检查 contractId 和 amount |
| 400 Bad Request | 金额 ≤ 0 | amount 必须 > 0 |
| 404 Not Found | 合同不存在 | 检查 contractId 是否正确 |
| 404 Not Found | 付款记录不存在 | 检查 ID 是否正确 |

## 📁 文件位置

```
app/api/procurement-payments/
├── route.ts              # GET 列表、POST 创建
└── [id]/route.ts         # GET 详情、DELETE 删除
```

## 📊 代码统计

- route.ts: 156 行
- [id]/route.ts: 126 行
- 总计: 282 行

## 🧪 测试

```bash
# 获取列表
curl http://localhost:3000/api/procurement-payments

# 创建付款（需要先有采购合同）
curl -X POST http://localhost:3000/api/procurement-payments \
  -H "Content-Type: application/json" \
  -d '{"contractId":"xxx","amount":50000}'
```

## 📚 详细文档

- `PROCUREMENT_PAYMENTS_SUMMARY.md` - 完整总结
- `prisma/schema.prisma` - 数据模型
- `lib/api/` - API 基础层

---

**最后更新**: 2026-03-17
