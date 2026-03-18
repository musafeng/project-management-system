# 工程项目管理系统 UI/UX 轻规范 v1.0

> 适配 Ant Design 5 + Next.js App Router + Tailwind CSS
> 目标：指导 Cursor 生成风格统一、员工易用的业务页面

---

## 1. 页面布局规范

### 1.1 整体结构

```
┌──────────────────────────────────────────────────┐
│  固定侧边栏 220px（折叠后 80px）                    │
│  ┌────────────────────────────────────────────┐  │
│  │  固定顶栏 56px（页面标题 + 用户信息）          │  │
│  ├────────────────────────────────────────────┤  │
│  │  内容区 padding: 16px 24px                  │  │
│  │  background: #f5f5f5                        │  │
│  │  min-height: calc(100vh - 56px)             │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 1.2 内容区规则

- 内容卡片最大宽度：不限制（充满内容区）
- 详情/表单页最大宽度：`max-width: 860px`，居中对齐
- 列表/台账页：充满内容区，`max-width: 100%`
- 卡片之间间距：`gap: 16px`
- 内容区与浏览器边缘：`padding: 16px 24px`（移动端 12px）

### 1.3 页面类型与对应布局

| 页面类型 | 布局方式 | 示例 |
|---------|---------|------|
| 台账/列表页 | 单列全宽白卡 | 项目台账、合同列表 |
| 详情工作台 | 顶部摘要 + 中部两栏 + 底部 Tabs | 项目详情 |
| 表单页（步骤式）| 单列居中，最大 780px | 付款申请 |
| 表单页（单页式）| 单列居中，最大 560px（弹窗内）| 新增合同弹窗 |
| 工作台首页 | 两列网格（左宽右窄）| 首页工作台 |
| 审批中心 | 单列全宽，Tabs 切换 | 审批中心 |

---

## 2. 卡片规范

### 2.1 基础卡片样式

```tsx
// 标准内容卡片
<Card
  bordered={false}
  style={{
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    padding: '20px 24px',
  }}
/>

// 次级信息卡片（内嵌在主卡中）
<Card
  bordered
  size="small"
  style={{ borderRadius: 10 }}
/>

// 统计数字卡片
<Card
  bordered={false}
  size="small"
  style={{
    borderRadius: 10,
    background: `${color}08`,
    border: `1px solid ${color}22`,
  }}
/>
```

### 2.2 卡片规则

- 主卡圆角：`12px`；次级卡圆角：`10px`；小组件圆角：`8px`
- 主卡阴影：`0 2px 10px rgba(0,0,0,0.06)`
- 嵌套卡片不再加阴影，用 `bordered` 区分层级
- 卡片内 padding：`20px 24px`（大）/ `16px 20px`（中）/ `12px 16px`（小）
- 卡片标题字号：`fontSize: 15, fontWeight: 600, color: '#1d1d1f'`
- 禁止用 `ConfigProvider` 包裹单个卡片改主题色

---

## 3. 表单规范

### 3.1 布局

- 默认 `layout="vertical"`，label 在上方
- 两列布局用 CSS Grid：`grid-template-columns: 1fr 1fr; gap: 0 16px`
- 移动端强制单列，不做两列
- 弹窗内表单顶部加 `margin-top: 16px`

### 3.2 字段规则

```tsx
// 金额类字段统一格式
<InputNumber
  prefix="¥"
  precision={2}
  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
  parser={(v) => v?.replace(/,/g, '') as any}
  style={{ width: '100%' }}
/>

// 日期字段
<DatePicker style={{ width: '100%' }} format="YYYY年MM月DD日" />

// 文本域统一 rows={3}，带字数统计
<Input.TextArea rows={3} showCount maxLength={500} />
```

### 3.3 校验规则

- 必填错误：`'请填写 {字段名}'`，不用"不能为空"
- 金额 <= 0：`'金额需大于 0，请重新填写'`
- 超出限额：`'不能超过剩余可付金额 {金额}'`
- 格式错误：`'请填写正确的手机号格式'`
- 表单底部汇总错误用 `<Alert type="error">` 展示业务级错误

### 3.4 步骤式表单规则

- 超过 5 个字段建议拆成多步
- 每步顶部有 `<Steps>` 进度条
- 每步顶部有标题（`Title level={5}`）+ 一句说明（`Paragraph type="secondary"`）
- 步骤底部固定：`上一步` 左 / `第X步共X步` 中 / `下一步` 右
- 最后一步提交按钮用绿色：`background: '#52c41a'`，文字含"进入审批"

---

## 4. 表格规范

### 4.1 基础配置

```tsx
<Table
  size="small"          // 统一 small，视觉更紧凑
  rowKey="id"
  scroll={{ x: 900 }}  // 宽表格必须设置
  pagination={{
    pageSize: 20,
    showTotal: (t) => `共 ${t} 条`,
    showSizeChanger: false,
  }}
/>
```

### 4.2 列优先级

1. 名称/标题列（可点击，蓝色链接样式，`fontWeight: 500`）
2. 关键业务字段（金额、状态、日期）
3. 辅助字段（创建人、备注）
4. 操作列（固定右侧 `fixed: 'right'`，宽度按按钮数量 120-200px）

### 4.3 操作列规则

```tsx
// 标准操作列顺序：查看 > 编辑 > 业务操作（提交审批）> 更多/删除
<Space size={2}>
  <Button type="link" size="small" icon={<EyeOutlined />}>查看</Button>
  <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
  <ApprovalActions ... />   {/* 审批按钮由组件控制显隐 */}
  <Popconfirm ...>          {/* 危险操作必须二次确认 */}
    <Button type="link" size="small" danger>删除</Button>
  </Popconfirm>
</Space>
```

### 4.4 金额列规则

- 所有金额列 `align: 'right'`
- 合同金额：`color: '#1677ff', fontWeight: 500`
- 已收/已付：`color: '#52c41a'`
- 未收/未付（有欠款）：`color: '#fa8c16'`
- 负数或超支：`color: '#ff4d4f'`

### 4.5 空状态

```tsx
// 禁止只写"暂无数据"，必须使用 EmptyHint 组件
locale={{
  emptyText: (
    <EmptyHint
      title="还没有合同"
      desc="新增合同后，可在此跟踪收款进度"
      action={<Button type="primary">新增合同</Button>}
    />
  ),
}}
```

---

## 5. 详情页规范

### 5.1 结构模板

```
← 返回列表
┌──────────────────────────────────────────┐
│ 标题 + 状态Tag + 编码       [快捷操作按钮] │
│ 关键属性横排（客户/区域/时间）              │
└──────────────────────────────────────────┘
┌─────┬─────┬─────┬─────┐
│统计 │统计 │统计 │统计 │  ← 4格统计卡
└─────┴─────┴─────┴─────┘
┌───────────┬──────────────────────────────┐
│ 基本信息   │ 收支/进度/金额明细             │
└───────────┴──────────────────────────────┘
┌──────────────────────────────────────────┐
│ Tabs：合同 / 收款 / 付款 / 审批记录        │
└──────────────────────────────────────────┘
```

### 5.2 规则

- 顶部必须有「← 返回列表」`Button type="link"`，`color: '#8c8c8c'`
- 快捷操作按钮最多 4 个，最右一个用 `type="primary"`
- `Descriptions` label 统一 `color: '#8c8c8c', width: 88px`
- Tabs 内子表格复用台账规范，不再加外层卡片 padding
- 详情页不内联编辑，编辑走弹窗或跳转编辑页

---

## 6. 审批流页面规范

### 6.1 审批中心布局

- 顶部 4 个 Tabs：待我审批 / 我已处理 / 抄送我 / 我发起的
- 「待我审批」Tab 标签显示 Badge，颜色 `#fa8c16`
- 筛选栏在 Tabs 内容区顶部，不放在 Tabs 外
- 表格操作列：查看、通过（绿色）、驳回（红色）
- 超 3 天未处理行背景：`#fff7e6`

### 6.2 单据内审批进度展示

```tsx
<Steps direction="vertical" size="small" current={currentIdx}
  items={nodes.map(n => ({
    title: n.name,
    description: n.handledBy
      ? `${n.handledByName} · ${fmtDate(n.handledAt)}`
      : '等待处理',
    status: n.status === 'APPROVED' ? 'finish'
           : n.status === 'REJECTED' ? 'error' : 'process',
  }))}
/>
```

### 6.3 驳回弹窗规则

- 标题：「请说明退回原因」
- 文本域 `rows={3}`，原因选填
- 确认按钮：`danger`，文字「确认退回」
- 取消按钮：文字「再想想」

---

## 7. 状态色使用规范

| 语义 | 色值 | 用途 |
|------|------|------|
| 主操作 | `#1677ff` | 按钮、链接、合同金额 |
| 成功/通过 | `#52c41a` | 已收款、审批通过、已完成 |
| 警告/待办 | `#fa8c16` | 审批中、未收款、超期 |
| 危险/驳回 | `#ff4d4f` | 已驳回、超支、删除 |
| 中性/草稿 | `#8c8c8c` | 草稿、已取消、辅助文字 |
| 分包专用 | `#722ed1` | 分包付款 Tag |
| 劳务专用 | `#eb2f96` | 劳务付款 Tag |

**Tag 标准写法：**
```tsx
// 统一使用 StatusTag 组件，禁止散写 Tag color
<StatusTag status={row.status} map={CONTRACT_STATUS} size="small" />
```

**统计卡片背景色：** `${color}08` 背景 + `${color}22` 边框

---

## 8. 间距规范

| 场景 | 值 |
|------|----|
| 页面内容区 padding（桌面）| `16px 24px` |
| 页面内容区 padding（移动）| `12px` |
| 主卡片内 padding | `20px 24px` |
| 次级卡片内 padding | `12px 16px` |
| 卡片间 gap | `16px` |
| 两列表单水平 gap | `16px` |
| 行内操作按钮间距 | `<Space size={2}>`（紧凑）|
| 筛选栏控件间距 | `gap: 8px` |
| Steps 条下方 | `margin-bottom: 32px` |

---

## 9. 文案语气规范

### 固定句式

| 场景 | 句式 |
|------|------|
| 操作成功 | `{对象}已{动词}` → 「合同已提交审批」|
| 操作失败 | `{原因}，请{解法}` → 「网络不稳定，请稍后重试」|
| 删除确认 | `确认删除「{名称}」？删除后无法恢复。` |
| 提交审批说明 | `提交后将推送给审批人，审批期间无法修改。` |
| 空状态引导 | `还没有{对象}，{操作}后会显示在这里。` |
| 必填提示 | `请填写{字段名}` |

### 禁用词

| ❌ 禁用 | ✅ 替换 |
|--------|--------|
| 参数错误 | 填写有误，请检查 |
| 校验失败 | 有必填项未完成 |
| 接口异常 | 操作暂时失败 |
| 提交失败请重试 | 保存未成功，请稍后再试 |
| 数据不存在 | 该记录已被删除 |
| 无权限 | 您没有权限，请联系管理员 |
| 暂无数据 | 还没有{对象}（加引导语）|
| 操作成功 | {具体对象}已{具体动作} |

---

## 10. 移动端适配规范

### 10.1 断点

```tsx
const [isMobile, setIsMobile] = useState(false)
useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768)
  check()
  window.addEventListener('resize', check)
  return () => window.removeEventListener('resize', check)
}, [])
```

### 10.2 移动端规则

| 元素 | 桌面端 | 移动端 |
|------|--------|--------|
| 侧边栏 | 固定显示 220px | 隐藏，汉堡按钮触发 Drawer |
| 表格 | 多列 + `scroll.x` | 精简到 3-4 列，其余收入详情 |
| 表单布局 | 两列 Grid | 强制单列 |
| 弹窗宽度 | `560-600px` | `95vw` |
| 按钮尺寸 | `size="middle"` | `size="large"`（更易点击）|
| 卡片 padding | `20px 24px` | `16px` |
| 列表页 | Table | 卡片列表（`MobileCard` 组件）|

### 10.3 移动端卡片列表模板

```tsx
// 移动端用卡片代替表格
function MobileCard({ item, onEdit, onView }) {
  return (
    <Card
      size="small"
      style={{ marginBottom: 12, borderRadius: 10 }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600 }}>{item.name}</span>
          <StatusTag status={item.status} map={CONTRACT_STATUS} size="small" />
        </div>
      }
      extra={<Button type="link" size="small" onClick={() => onView(item.id)}>详情</Button>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 13 }}>
        <div><span style={{ color: '#999' }}>金额：</span>{fmtMoney(item.contractAmount)}</div>
        <div><span style={{ color: '#999' }}>日期：</span>{fmtDate(item.signDate)}</div>
      </div>
    </Card>
  )
}
```

---

## 附录：Cursor 生成页面时的 Checklist

生成任何新页面前，确认以下项目：

- [ ] 使用 `LedgerPageLayout` 包裹台账页
- [ ] 使用 `FilterBar` 组件，不手写筛选控件
- [ ] 使用 `StatusTag` 组件，不散写 `<Tag color=...>`
- [ ] 空状态使用 `EmptyHint`，不写"暂无数据"
- [ ] 所有金额字段用 `fmtMoney()` 格式化
- [ ] 所有日期字段用 `fmtDate()` 格式化
- [ ] 危险操作（删除）必须加 `Popconfirm`
- [ ] 表格操作列固定右侧 `fixed: 'right'`
- [ ] 错误提示用业务语言，不含技术术语
- [ ] 移动端检测 `isMobile`，切换卡片/Table 布局
- [ ] 所有 fetch 加 `credentials: 'include'`
- [ ] 页面级错误用 `message.error()`，表单字段错误用 `form.setFields()`

