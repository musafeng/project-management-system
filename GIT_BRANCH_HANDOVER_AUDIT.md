# Git 分支接管审计报告

生成时间：2026-05-17
仓库：`git@github.com:musafeng/project-management-system.git`
本地路径：`/Users/fengtang/Documents/开发项目/公司管理系统/project-manager`
执行人：Kiro（接管前的状态梳理）

---

## 一、当前代码库状态

### 1.1 仓库基本面

- 当前分支：`staging/claude-handover-ux-dingtalk`（已创建，HEAD=a45751c，从 `fix/security-transaction-permissions` 同点切出）
- `staging/claude-handover-ux-dingtalk` 尚未推送到 origin（仅本地）
- 最近一次 `git fetch`：2026-05-17
- `git stash`：空
- 未跟踪文件：本审计报告 `GIT_BRANCH_HANDOVER_AUDIT.md` 自身

### 1.2 未提交改动

工作区有一处未提交改动，来源未知，**风险中等**：

```
M scripts/deploy-server.sh
  - 文件权限从 100755 改成 100644（丢失可执行位，部署会失败）
  - 删除了 RELEASES_DIR 多版本发布机制
  - 删除了健康检查失败时的自动回滚到旧版本
  - 改成在原地 git reset --hard 覆盖式部署
  - 净改动：+23 / -58 行
```

这是把"多版本发布 + 自动回滚"改造成了"原地覆盖部署"，不是简单 bugfix。在没有确认部署策略变更意图前，不能丢、也不能直接合进任何分支。

### 1.3 本地分支清单

| 分支 | HEAD | 相对 main | 远端跟踪 | 备注 |
|------|------|-----------|----------|------|
| `main` | 22a9a80 | — | origin/main | 当前已上线版本基线 |
| `fix/security-transaction-permissions` | a45751c | **+12 / -0** | origin 同步 | **当前所在分支，最新** |
| `fix/launch-finalize` | 90e0e5a | +6 / -33 | origin 同步 | **平行重构线，差异巨大** |
| `fix/qiyun-approval-flow` | c7cfd16 | 0 / -3 | origin 同步 | 已合入 main |
| `codex/final-fixes-round-8` | 53010a3 | 0 / -20 | origin 同步 | 已合入 main |
| `codex/fix-multi-pdf-upload` | a5decd1 | 0 / -10 | origin 同步 | 已合入 main |

> `fix/launch-finalize` 在 `git branch -vv` 中显示其工作区指向 `/Users/a1/.cursor/worktrees/project-manager/kai`，说明这条分支可能是另一台机器/Cursor worktree 上的工作产物，不一定是本机日常迭代主线。

### 1.4 远端分支

`origin` 上的分支与本地分支一一对应，没有"只在远端、本地没拉下来"的情况。

### 1.5 main 之上、可见的最近 12 条提交（即 `fix/security-transaction-permissions` 领先 main 的内容）

```
a45751c fix: preview attachments in-app
2b942db fix attachment open and urge notification feedback
67623f4 fix: 修复附件预览和手机端上传问题
a01beeb fix: 修复9项测试问题
955a645 feat(upload): 第八批 — 上传进度条 + DynamicForm 多文件支持
cade353 feat(mobile): batch 7 — apply MobileCardList to remaining 7 pages
d3361f5 第七批：management-expenses 移动端适配
cfbfaff 第七批：suppliers / labor-workers 移动端适配
96f0261 第七批 试点：customers 移动端适配
2aec38d 第六批 方案A：财务汇总接口合并重复的合同查询
eac5fda 第五批：钉钉接口/版本号/区域切换加固
fb15718 修复安全/并发/权限问题（不改业务逻辑）
```

涉及范围：移动端适配（多页）、附件预览/上传、催办反馈、钉钉加固、安全/并发/权限修复。**这条线就是你目前真实使用的版本所在的线，所有移动端适配工作都在这里。**

---

## 二、各分支评价

### 2.1 `fix/security-transaction-permissions` — 推荐作为测试基线

- 领先 main 12 个提交，落后 0 个
- 包含全部"第五批 / 第六批 / 第七批 / 第八批"批次工作
- 涵盖移动端适配、附件、钉钉、催办、安全权限
- 与你描述的"系统已能落地使用，但移动端体验差/钉钉催办不足"完全对得上——它就是当前生产线
- **结论：必须保留。作为 staging 分支的起点。**

### 2.2 `fix/launch-finalize` — 暂时保留，不要合并

- 落后 main 33 个提交，意味着它分叉很早
- 与 main 的差异是 268 个文件、+20191 / **-1191079** 行
- 删除巨大（百万级）说明它的 diff 包含 `package-lock.json` 大重写、生成文件、迁移文件删除、大量旧测试 / 旧文档移除
- 它独立带有 `lib/settlement/base-settlement.service.ts`、`lib/system-manager.ts` 移除、`scripts/init-system.js` 等架构级改动
- **结论：保留分支不删。但在没做 diff 评审前，不要合进 main，也不要合进 staging。它是另一条独立路线。**

### 2.3 `fix/qiyun-approval-flow` — 已合入 main，可归档

- 已是 main 的祖先（落后 3 但本身没领先）
- main 上的 `921a8b9 Merge fix/qiyun-approval-flow into main` 已经把它合进来了
- **结论：可保留远端备份，本地分支可删。**

### 2.4 `codex/final-fixes-round-8` — 已合入 main，可归档

- ahead=0 / behind=20，说明它的 HEAD 已被 main 包含
- **结论：本地分支可删，远端保留作为审计痕迹。**

### 2.5 `codex/fix-multi-pdf-upload` — 已合入 main，可归档

- ahead=0 / behind=10
- **结论：本地分支可删，远端保留作为审计痕迹。**

---

## 三、不应该现在合并的代码

1. **`fix/launch-finalize` 的整支**：百万行删除中可能包含被你"已经线上使用"的 schema、seed、deploy 脚本，盲合会把已上线功能回退掉。需要单独走 review 流程。
2. **当前工作区 `scripts/deploy-server.sh` 的未提交改动**：把多版本发布改成原地覆盖、丢可执行位，未经确认前不要带进任何受信分支。
3. **任何 codex/* 分支上"已合入但又有零散改动"的内容**：经过对比都已是 main 祖先，不需要再合。

---

## 四、推荐的测试部署分支

**分支名**：`staging/claude-handover-ux-dingtalk` ✅ 已创建（本地，未推送 origin）

**起点**：`fix/security-transaction-permissions`（HEAD=a45751c）— 与该分支当前完全等点

**用途**：
- 部署测试 / 真实使用回归
- 移动端体验改造
- 前端体验改造（参考氚云 / 钉钉）
- 钉钉待办、催办能力补齐方案验证

**保护要求**：
- 不直接合进 main
- 不强推 / 不 force push
- 阶段性产出回流通过 PR + review

---

## 五、后续合并到 main 的安全路径

```
                                 ┌─→ (review per-feature) ─→ main
                                 │
staging/claude-handover-ux-dingtalk
   ▲           ▲             ▲
   │           │             │
   │           │       人工/真机测试通过的提交
   │           │
   │     新功能（移动端 / 钉钉催办）
   │
基底：fix/security-transaction-permissions（已含全部已上线批次）
```

具体步骤建议：

1. **当前阶段**：`staging/claude-handover-ux-dingtalk` 上做 UI 改造和钉钉方案验证。这条分支自由迭代，可以频繁提交。
2. **阶段性回流**：每完成一块（例如"移动端工作台改版"），从 staging 切一个 `feat/xxx` 子分支，PR 到 main，单独评审。
3. **`fix/security-transaction-permissions` 自身**：建议另起一个 PR 到 main，把 12 个累积提交合并掉，作为"接管前的存量同步"。这一步要在 staging 投入大量新改动**之前**做，否则后期 rebase 成本会变高。
4. **`fix/launch-finalize`**：单独安排时间评审。先看它实际涉及什么、跟现行版本差多少，再决定是放弃、cherry-pick、还是整体并轨。
5. **已合入 main 的旧分支清理**：`fix/qiyun-approval-flow` / `codex/final-fixes-round-8` / `codex/fix-multi-pdf-upload` 这三条本地分支可以在确认无本地改动后删除（远端保留）。

---

## 六、风险与待确认事项

| 项 | 风险 | 建议处理 |
|----|------|----------|
| `scripts/deploy-server.sh` 未提交改动 | 改了部署模型 + 丢可执行位 | 切分支前不要丢，由用户确认是否要保留这个改造 |
| `fix/launch-finalize` 来自外部 worktree | 可能不在本机迭代节奏内 | 切勿盲合，先约一次 diff review |
| 提交记录里中英文混用、风格不一 | Cursor / Codex / Claude Code 多人多工具留痕 | staging 分支建议固定 commit 风格 |
| `package-lock.json` 在 `fix/launch-finalize` 里大改 | 依赖树可能漂移 | 合入前对齐 Node/npm 版本 |

---

报告完。staging 分支已创建，等待用户处理 `scripts/deploy-server.sh` 未提交改动后即可进入下一阶段。
