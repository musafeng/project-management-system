# 企业级 API 基础层使用指南

## 概述

本文档说明如何使用企业级 API 基础层来开发正式版 API。

---

## 核心组件

### 1. 数据库访问层 (`lib/db.ts`)

统一的 Prisma Client 访问入口。

**使用方式：**

```typescript
import { db } from '@/lib/db'

// 查询项目
const projects = await db.project.findMany()

// 查询客户
const customer = await db.customer.findUnique({
  where: { id: 'xxx' }
})

// 创建合同
const contract = await db.projectContract.create({
  data: {
    projectId: 'xxx',
    customerId: 'xxx',
    code: 'CT-001',
    name: '项目合同',
    contractAmount: 100000,
  }
})
```

**可用的数据库对象：**

- `db.customer` - 客户
- `db.supplier` - 供应商
- `db.laborWorker` - 劳务人员
- `db.subcontractVendor` - 分包单位
- `db.project` - 项目
- `db.projectStatusChange` - 项目状态变更
- `db.constructionApproval` - 施工立项
- `db.projectContract` - 项目合同
- `db.projectContractChange` - 项目合同变更
- `db.procurementContract` - 采购合同
- `db.laborContract` - 劳务合同
- `db.subcontractContract` - 分包合同
- `db.contractReceipt` - 合同收款
- `db.otherReceipt` - 其他收款
- `db.procurementPayment` - 采购付款
- `db.laborPayment` - 劳务付款
- `db.subcontractPayment` - 分包付款
- `db.otherPayment` - 其他付款
- `db.projectExpense` - 项目费用
- `db.managementExpense` - 管理费用
- `db.salesExpense` - 销售费用
- `db.pettyCash` - 备用金

---

## 2. 统一错误处理 (`lib/api/errors.ts`)

提供标准化的错误类。

**可用的错误类：**

```typescript
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  ValidationError,
} from '@/lib/api'

// 使用示例
throw new BadRequestError('参数错误')
throw new NotFoundError('项目不存在')
throw new ValidationError('金额必须大于 0')
throw new ConflictError('数据已存在')
```

---

## 3. 统一返回格式 (`lib/api/response.ts`)

所有 API 返回统一的 JSON 格式。

**成功返回：**

```typescript
{
  success: true,
  data: { /* 业务数据 */ }
}
```

**失败返回：**

```typescript
{
  success: false,
  error: "错误信息"
}
```

**使用方式：**

```typescript
import { success, error } from '@/lib/api'

// 成功
return success({ id: '123', name: '项目名称' })

// 失败
return error('项目不存在')
```

---

## 4. API 处理器 (`lib/api/handler.ts`)

自动处理 try/catch、错误转换、返回格式统一。

### 基础用法

```typescript
import { apiHandler, success, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const GET = apiHandler(async (req) => {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('id')
  
  if (!projectId) {
    throw new BadRequestError('缺少项目 ID')
  }
  
  const project = await db.project.findUnique({
    where: { id: projectId }
  })
  
  if (!project) {
    throw new NotFoundError('项目不存在')
  }
  
  return success(project)
})
```

### 多方法 API

```typescript
import { apiHandlerWithMethod, success, BadRequestError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST, PUT, DELETE } = apiHandlerWithMethod({
  GET: async (req) => {
    const projects = await db.project.findMany()
    return success(projects)
  },
  
  POST: async (req) => {
    const body = await req.json()
    
    if (!body.name || !body.customerId) {
      throw new BadRequestError('缺少必填字段')
    }
    
    const project = await db.project.create({
      data: {
        code: `PRJ-${Date.now()}`,
        name: body.name,
        customerId: body.customerId,
        budget: body.budget || 0,
      }
    })
    
    return success(project)
  },
  
  PUT: async (req) => {
    const body = await req.json()
    
    if (!body.id) {
      throw new BadRequestError('缺少项目 ID')
    }
    
    const project = await db.project.update({
      where: { id: body.id },
      data: body
    })
    
    return success(project)
  },
  
  DELETE: async (req) => {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('id')
    
    if (!projectId) {
      throw new BadRequestError('缺少项目 ID')
    }
    
    await db.project.delete({
      where: { id: projectId }
    })
    
    return success({ message: '删除成功' })
  }
})
```

---

## 完整示例：创建项目 API

**文件：`app/api/projects/route.ts`**

```typescript
import { apiHandlerWithMethod, success, BadRequestError, NotFoundError } from '@/lib/api'
import { db } from '@/lib/db'

export const { GET, POST } = apiHandlerWithMethod({
  // 获取所有项目
  GET: async (req) => {
    const projects = await db.project.findMany({
      include: {
        customer: true,
        contracts: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return success(projects)
  },
  
  // 创建项目
  POST: async (req) => {
    const body = await req.json()
    
    // 验证必填字段
    if (!body.name || !body.customerId) {
      throw new BadRequestError('项目名称和客户 ID 为必填项')
    }
    
    // 验证客户是否存在
    const customer = await db.customer.findUnique({
      where: { id: body.customerId }
    })
    
    if (!customer) {
      throw new NotFoundError('客户不存在')
    }
    
    // 创建项目
    const project = await db.project.create({
      data: {
        code: `PRJ-${Date.now()}`,
        name: body.name,
        customerId: body.customerId,
        budget: body.budget || 0,
        status: 'PLANNING',
      },
      include: { customer: true }
    })
    
    return success(project)
  }
})
```

---

## 错误处理流程

1. **业务逻辑抛出错误**
   ```typescript
   throw new NotFoundError('项目不存在')
   ```

2. **apiHandler 捕获错误**
   - 识别错误类型
   - 提取 statusCode 和 message

3. **自动返回标准格式**
   ```json
   {
     "success": false,
     "error": "项目不存在"
   }
   ```
   HTTP Status: 404

---

## 最佳实践

### 1. 始终使用 apiHandler

```typescript
// ✅ 正确
export const GET = apiHandler(async (req) => {
  // ...
})

// ❌ 错误
export async function GET(req: Request) {
  // ...
}
```

### 2. 使用适当的错误类

```typescript
// ✅ 正确
if (!project) {
  throw new NotFoundError('项目不存在')
}

// ❌ 错误
if (!project) {
  throw new Error('项目不存在')
}
```

### 3. 验证输入参数

```typescript
// ✅ 正确
if (!body.name) {
  throw new BadRequestError('项目名称为必填项')
}

// ❌ 错误
const project = await db.project.create({
  data: body // 直接使用未验证的输入
})
```

### 4. 使用 db 访问数据库

```typescript
// ✅ 正确
const project = await db.project.findUnique({ where: { id } })

// ❌ 错误
import { prisma } from '@/lib/prisma'
const project = await prisma.project.findUnique({ where: { id } })
```

---

## 常见错误代码

| 错误类 | HTTP 状态 | 用途 |
|--------|---------|------|
| BadRequestError | 400 | 请求参数错误 |
| UnauthorizedError | 401 | 未授权 |
| ForbiddenError | 403 | 禁止访问 |
| NotFoundError | 404 | 资源不存在 |
| ConflictError | 409 | 数据冲突（如唯一性约束） |
| ValidationError | 422 | 数据验证失败 |
| InternalServerError | 500 | 服务器内部错误 |

---

## 后续开发

使用本基础层开发以下 API：

- `/api/customers` - 客户管理
- `/api/projects` - 项目管理
- `/api/contracts` - 合同管理
- `/api/suppliers` - 供应商管理
- `/api/labor-workers` - 劳务人员管理
- `/api/receipts` - 收款管理
- `/api/payments` - 付款管理
- `/api/expenses` - 费用管理

所有 API 都应该使用 `apiHandler` 或 `apiHandlerWithMethod` 包装。

