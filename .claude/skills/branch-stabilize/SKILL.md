---
name: branch-stabilize
description: 分支整理、合并前检查、测试分支准备。用于在多分支混乱状态下梳理出稳定测试线，或者在合并前做一次"这分支真的能合吗"的体检。
---

# 分支稳定化 Skill

## 何时调用

- 仓库分支多、状态混乱（多人/多 AI 工具改过）
- 准备把某个分支合到 main 前
- 准备从某条分支切出新的工作分支前
- 用户问"现在哪个分支最稳"
- 计划部署测试前，需要确定基线分支

## 标准流程

### 1. 收集分支事实

并行执行：

```bash
git fetch --all --prune
git status
git branch -vv
git branch -r
git log --oneline -20
git stash list
git worktree list
```

对每条本地分支算 ahead/behind：

```bash
for b in $(git branch --format='%(refname:short)'); do
  ahead=$(git rev-list --count main..$b 2>/dev/null)
  behind=$(git rev-list --count $b..main 2>/dev/null)
  echo "$b  ahead=$ahead  behind=$behind"
done
```

### 2. 给每条分支打标签

按以下分类：

| 标签 | 判定 | 处理 |
|------|------|------|
| **生产基线** | `main` | 不动 |
| **当前主线** | ahead>0、behind=0、有近期提交 | 保留，作为新工作起点 |
| **已合并** | ahead=0 | 保留远端，本地可在用户许可后删 |
| **平行路线** | ahead>0 且 behind>0 | 标记需 review，**禁止盲合** |
| **外部 worktree** | `branch -vv` 显示 `/Users/.../worktrees/...` | 不要改，不要 prune，先报告 |

### 3. 处理未提交改动

工作区有 modified / untracked 时：

- **永远不丢弃**。优先 `git stash push -m "wip: <场景>" -- <file>` 或建独立 `wip/*` 分支。
- 区分"用户在做"和"AI 残留"：看修改时间、看是否有意义。不确定就 stash 备份后等用户确认。
- 涉及 `scripts/deploy-server.sh`、`prisma/`、`.env*` 的未提交改动，直接拉用户进来确认。

### 4. 测试分支准备

如果用户要新建测试分支：

1. 确认起点分支（通常是"当前主线"标签那条）
2. 确认起点的 HEAD 干净（无未提交改动 / 已 stash）
3. `git checkout -b staging/<purpose>-<scope>`
4. 立即推送 `git push -u origin staging/<purpose>-<scope>`，避免本地崩溃丢失
5. 在分支上提交一份"基线说明"：交代起点 SHA、用途、保护要求

### 6. 合并前体检

任何 PR 合到 main 前，必须过：

- [ ] 与 main 无冲突（`git merge --no-commit --no-ff main` 试合，立即 abort）
- [ ] CI / 类型检查 / 构建通过
- [ ] CLAUDE.md 第四节列出的 5 大核心能力没有被改，或改动已显式说明并验证
- [ ] 数据库 schema 未动；如动了必须有迁移文件且用户同意
- [ ] `package-lock.json` 不能在没改 `package.json` 的情况下被改写
- [ ] 移动端 + PC 端都已验证

任一不过 = 不合。

## 必须遵守

- **不要 force push**，对 main 永远不 force。
- **不要删分支**，除非用户明确点头。
- **不要 prune worktree**，除非确认没有其它机器在用。
- **不要 rebase 已推送分支**（除非分支是个人独占且用户同意）。
- **不要在 stash 上长期堆积**，处理完未提交改动后及时让用户决定 pop / drop。

## 输出格式

固定使用：

```
【分支清单】
【当前主线】
【风险点】
【建议处理】
【下一步命令】（待用户确认后再执行）
```

## 关联

- `GIT_BRANCH_HANDOVER_AUDIT.md`：本项目一次具体的分支审计实例，可作为模板
- `CLAUDE.md` 第一节：分支与合并规则
- `.claude/skills/release-check/SKILL.md`：合并后部署前的检查
