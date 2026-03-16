# 施工立项 API 快速参考

## 📋 接口速查表

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/construction-approvals` | GET | 列表 |
| `/api/construction-approvals` | POST | 创建 |
| `/api/construction-approvals/{id}` | GET | 详情 |
| `/api/construction-approvals/{id}` | PUT | 更新 |
| `/api/construction-approvals/{id}` | DELETE | 删除 |

## 🔧 快速命令

```bash
# 获取列表
curl http://localhost:3000/api/construction-approvals

# 按项目过滤
curl "http://localhost:3000/api/construction-approvals?projectId=ID"

# 按合同过滤
curl "http://localhost:3000/api/construction-approvals?contractId=ID"

# 创建立项
curl -X POST http://localhost:3000/api/construction-approvals \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "ID",
    "contractId": "ID",
    "name": "基础施工",
    "budgetAmount": 500000,
    "startDate": "2026-03-17T00:00:00Z",
    "remark": "第一阶段"
  }'

# 获取详情
curl http://localhost:3000/api/construction-approvals/ID

# 更新
curl -X PUT http://localhost:3000/api/construction-approvals/ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "基础施工（更新）",
    "budgetAmount": 550000
  }'

# 删除
curl -X DELETE http://localhost:3000/api/construction-approvals/ID
```

## 📦 请求体格式

### POST 创建立项

```json
{
  "projectId": "必填",
  "contractId": "必填",
  "name": "必填",
  "budgetAmount": "可选，默认 0",
  "startDate": "可选",
  "remark": "可选"
}
```

### PUT 更新立项

```json
{
  "name": "可选",
  "budgetAmount": "可选",
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
| id | String | 立项 ID |
| code | String | 立项编码 (CONST + 时间戳) |
| projectId | String | 项目 ID |
| projectName | String | 项目名称 |
| contractId | String | 合同 ID |
| contractCode | String | 合同编码 |
| name | String | 立项名称 |
| budgetAmount | Decimal | 预算金额 |
| status | String | 状态 (active/inactive) |
| startDate | DateTime | 开始日期 |
| endDate | DateTime | 结束日期 |
| remark | String | 备注 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

## ❌ 常见错误

| 错误 | 原因 | 解决 |
|------|------|------|
| 400 Bad Request | 缺少必填字段 | 检查 projectId、contractId、name |
| 400 Bad Request | 合同不属于该项目 | 确保合同属于指定项目 |
| 404 Not Found | 项目不存在 | 检查 projectId 是否正确 |
| 404 Not Found | 合同不存在 | 检查 contractId 是否正确 |
| 404 Not Found | 立项不存在 | 检查 ID 是否正确 |
| 409 Conflict | 立项已产生合同 | 先删除关联的合同 |

## 📁 文件位置

```
app/api/construction-approvals/
├── route.ts              # GET 列表、POST 创建
└── [id]/route.ts         # GET 详情、PUT 更新、DELETE 删除
```

## 📊 代码统计

- route.ts: 154 行
- [id]/route.ts: 219 行
- 总计: 373 行

## 🧪 测试

```bash
# 获取列表
curl http://localhost:3000/api/construction-approvals

# 创建立项（需要先有项目和合同）
curl -X POST http://localhost:3000/api/construction-approvals \
  -H "Content-Type: application/json" \
  -d '{"projectId":"xxx","contractId":"yyy","name":"测试立项"}'
```

## 📚 详细文档

- `CONSTRUCTION_APPROVALS_SUMMARY.md` - 完整总结
- `prisma/schema.prisma` - 数据模型
- `lib/api/` - API 基础层

---

**最后更新**: 2026-03-17
