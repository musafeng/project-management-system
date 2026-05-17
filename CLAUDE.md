# 项目长期规则（Claude Code 必读）

本项目已上线使用，存在真实业务数据和真实用户。任何在本仓库工作的 Claude（不论模型版本、不论会话来源）都必须遵守以下规则。规则优先级高于"看起来更优雅的写法"。

## 一、分支与合并

- **不要直接改 `main`**。`main` 是上线基线，所有改动必须经 `staging/*` 或 `feat/*` 分支再 PR。
- **不要 force push 到任何远端分支**，尤其不要对 `main` 做 reset。
- **不要删除分支**（包括看似已合并的 `codex/*`、`fix/qiyun-approval-flow` 等），除非用户明确点头。它们承载历史和审计痕迹。
- 当前默认工作分支：`staging/claude-handover-ux-dingtalk`。
- 平行存在的 `fix/launch-finalize` 分支差异巨大（落后 main 33、独立 6），**永远不要盲合**，需要单独评审。

## 二、动手前先审计

- **先审计，再改代码**。任何非 typo 修复都先读相关文件、对齐数据流，再动手。
- **不要大规模重构**。本仓库经历过多个 AI 工具（Cursor、Codex、Claude Code）多人改动，存量风格不统一，但这不是重写的理由。
- **改动范围最小化**：只改任务要求的内容，不要"顺手"清理周边代码、不要"顺手"升级依赖、不要"顺手"重命名变量。
- 不确定的部分，**先问用户**而不是猜。

## 三、移动端与 PC 端

- **移动端优先，但不能破坏 PC 端**。本项目主要使用场景是钉钉内嵌移动端，但桌面 Web 仍在使用。
- 任何 UI 改动必须同时验证 PC 和移动端两套布局。
- 若使用响应式断点，断点策略沿用现有约定，不要新引入断点体系。
- 移动端组件已有现成基础（`MobileCardList` 等），优先复用，不要新造轮子。

## 四、严禁破坏的核心能力

以下 5 大业务在生产中正在被使用，**任何破坏都视为严重事故**：

1. **审批流**：`lib/approval.ts`、`app/api/approval/route.ts`、`app/approval/page.tsx` 及各业务表上的审批节点
2. **收付款**：`app/api/*-payments`、`app/api/*-receipts`、`app/api/contract-receipts`、所有结算金额相关计算
3. **附件**：`components/AttachmentUploadField.tsx`、`components/AttachmentPreviewLinks.tsx`、`app/api/upload`、`app/api/attachments/open`、签名链接逻辑
4. **登录与会话**：`lib/auth-client.ts`、`app/api/auth/*`、钉钉免登逻辑
5. **权限与区域隔离**：`lib/api/permissions.ts`、各 route handler 中的区域过滤、角色校验

涉及上述任何一项的改动，必须在回复中**显式列出影响范围 + 验证方式**，不能默默改。

## 五、不得擅自做的事

- **不要改数据库 schema**（`prisma/schema.prisma`、迁移目录）。需要变更必须先和用户对齐。
- **不要执行 `prisma migrate` / `prisma db push` / 任何写数据库的操作**。
- **不要改 `scripts/deploy-server.sh` 部署逻辑**，除非用户明确要求。当前线上部署模型是"多版本发布目录 + 健康检查失败自动回滚"。
- **不要安装新的 npm 依赖**，除非用户明确同意。如必须，优先用已存在的同类库。
- **不要安装第三方 MCP / 第三方 hooks**。本项目维持 Claude Code 原生能力 + 项目内 skills。
- **不要把 `.env`、`.env.local`、密钥、签名 secret 写进任何提交或回复**。
- **不要新建 `*.md` 文档文件**（除非用户明确要求）。审计/方案/对比类输出直接放在回复正文。

## 六、改完必跑的检查

任何代码改动后，按情况运行：

- TypeScript 类型检查：`npm run typecheck`（若 package.json 有此脚本）或 `npx tsc --noEmit`
- 构建：`npm run build:server`
- 已有测试：`npm test` 或对应子集
- ESLint：`npm run lint`（若存在）

构建/类型检查未过 = 不算完成。优先跑类型检查，因为本项目类型链路是关键护栏。

## 七、回复格式约束

- **每次回复必须简洁**。不堆砌、不写"这是一个非常好的问题"、不复述用户的话。
- 每次实质性改动后，必须列出：
  1. **改了哪些文件**（路径列表，可附 `:line` 锚点）
  2. **怎么验证**（具体命令或操作步骤，能让用户在自己机器上复现的程度）
- 长输出统一使用结构化标题，不要意识流。
- 中英文混排时半角空格保持一致。

## 八、与项目外部能力的边界

- 钉钉相关代码集中在 `lib/dingtalk.ts`、`lib/dingtalk-notify.ts`。改钉钉能力必须考虑：
  - 是否影响免登
  - 是否影响工作通知 / 待办 / 催办
  - 是否需要新增 access_token 缓存或限流
- 不要给钉钉相关功能加未经验证的"重试""退避""队列"等基础设施。先把必要功能跑通再谈鲁棒性。

## 九、真实情况标注

- 当前项目状态：**已上线、有真实用户、移动端体验和钉钉催办能力是接下来的主战场**。
- `staging/claude-handover-ux-dingtalk` 是接下来所有改造的工作分支。
- 详细分支审计见 `GIT_BRANCH_HANDOVER_AUDIT.md`。

---

违反以上规则、或对规则有疑问时，**先停下来问用户**，再决定是否继续。
