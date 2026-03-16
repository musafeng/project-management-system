# 采购合同 API 快速参考

## 📋 接口速查表

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/procurement-contracts` | GET | 列表 |
| `/api/procurement-contracts` | POST | 创建 |
| `/api/procurement-contracts/{id}` | GET | 详情 |
| `/api/procurement-contracts/{id}` | PUT | 更新 |
| `/api/procurement-contracts/{id}` | DELETE | 删除 |

## 🔧 快速命令

```bash
# 获取列表
curl http://localhost:3000/api/procurement-contracts

# 按项目过滤
curl "http://localhost:3000/api/procurement-contracts?projectId=ID"

# 按施工立项过滤
curl "http://localhost:3000/api/procurement-contracts?constructionId=ID"

# 创建合同
curl -X POST http://localhost:3000/api/procurement-contracts \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "ID",
    "constructionId": "ID",
    "supplierId": "ID",
    "contractAmount": 100000,
    "signDate": "2026-03-17T00:00:00Z",
    "remark": "钢材采购"
  }'

# 获取详情
curl http://localhost:3000/api/procurement-contracts/ID

# 更新
curl -X PUT http://localhost:3000/api/procurement-contracts/ID \
  -H "Content-Type: application/json" \
  -d '{
    "changedAmount": 10000,
    "status": "APPROVED"
  }'

# 删除
curl -X DELETE http://localhost:3000/api/procurement-contracts/ID
```

## 📦 请求体格式

### POST 创建合同

```json
{
  "projectId": "必填",
  "constructionId": "必填",
  "supplierId": "必填",
  "contractAmount": "必填，> 0",
  "signDate": "可选",
  "remark": "可选"
}
```

### PUT 更新合同

```json
{
  "changedAmount": "可选",
  "signDate": "可选",
  "startDate": "可选",
  "endDate": "可选",
  "status": "可选",
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
| id | String | 合同 ID |
| code | String | 合同编码 (PROC + 时间戳) |
| projectId | String | 项目 ID |
| projectName | String | 项目名称 |
| constructionId | String | 施工立项 ID |
| constructionName | String | 施工立项名称 |
| supplierId | String | 供应商 ID |
| supplierName | String | 供应商名称 |
| contractAmount | Decimal | 合同金额 |
| changedAmount | Decimal | 变更金额 |
| payableAmount | Decimal | 应付金额 |
| paidAmount | Decimal | 已付金额 |
| unpaidAmount | Decimal | 未付金额 |
| status | String | 状态 (DRAFT/APPROVED/EXECUTING/COMPLETED) |
| signDate | DateTime | 签订日期 |
| startDate | DateTime | 开始日期 |
| endDate | DateTime | 结束日期 |
| remark | String | 备注 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

## ❌ 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| 400 Bad Request | 缺少必填字段 | 检查 projectId、constructionId、supplierId、contractAmount |
| 400 Bad Request | 金额 ≤ 0 | contractAmount 必须 > 0 |
| 400 Bad Request | 立项不属于该项目 | 确保立项属于指定项目 |
| 404 Not Found | 项目不存在 | 检查 projectId 是否正确 |
| 404 Not Found | 施工立项不存在 | 检查 constructionId 是否正确 |
| 404 Not Found | 供应商不存在 | 检查 supplierId 是否正确 |
| 404 Not Found | 合同不存在 | 检查 ID 是否正确 |
| 409 Conflict | 合同已产生付款 | 先删除关联的付款记录 |

## 📁 文件位置

```
app/api/procurement-contracts/
├── route.ts              # GET 列表、POST 创建
└── [id]/route.ts         # GET 详情、PUT 更新、DELETE 删除
```

## 📊 代码统计

- route.ts: 192 行
- [id]/route.ts: 226 行
- 总计: 418 行

## 🧪 测试

```bash
# 获取列表
curl http://localhost:3000/api/procurement-contracts

# 创建合同（需要先有项目、立项和供应商）
curl -X POST http://localhost:3000/api/procurement-contracts \
  -H "Content-Type: application/json" \
  -d '{
    "projectId":"xxx",
    "constructionId":"yyy",
    "supplierId":"zzz",
    "contractAmount":100000
  }'
```

## 📚 详细文档

- `PROCUREMENT_CONTRACTS_SUMMARY.md` - 完整总结
- `prisma/schema.prisma` - 数据模型
- `lib/api/` - API 基础层

---

**最后更新**: 2026-03-17
