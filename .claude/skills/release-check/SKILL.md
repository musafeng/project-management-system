---
name: release-check
description: 每次部署前的发布检查清单。检查代码、构建、迁移、配置、回滚预案是否就绪。用于把"部署"从凭感觉变成有据可查。
---

# 发布前检查 Skill

## 何时调用

- 用户说"准备部署"、"上线"、"发版本"、"推到生产"
- PR 即将合到 main 前的最后一道闸
- 部署失败后做事故复盘的检查模板
- 周期性巡检（即使不发版也定期跑一遍）

## 当前部署模型（必读）

`scripts/deploy-server.sh` 现行策略：

- 多版本发布目录：`/root/project-management-system-releases/<sha>-<timestamp>/`
- 每次部署创建新 worktree → 安装依赖 → 构建 → PM2 切换
- 健康检查失败时，自动回滚到 `OLD_CWD`
- `KEEP_RELEASES=3` 默认保留最近 3 版

**任何发布检查必须围绕这个模型**。如果用户当前部署脚本被改成了"原地覆盖"，先停下来确认。

## 检查清单（按顺序过）

### A. 代码与分支

- [ ] 当前合并目标分支是 `main`，不是 staging
- [ ] `main` 上的待发版本是经过 PR 合入的，不是直推
- [ ] 待发 commit 的范围已和用户确认，没有夹带未审改动
- [ ] `git status` 干净，没有未提交残留
- [ ] `git log main..origin/main` 为空（本地与远端一致）

### B. 构建与类型

- [ ] `npm ci`（不是 `npm install`，避免改 lock）
- [ ] `npx tsc --noEmit` 或 `npm run typecheck` 通过
- [ ] `npm run build:server` 通过且无新增 warning
- [ ] `npm test`（若有）通过
- [ ] `npm run lint`（若有）通过

### C. 数据库迁移

- [ ] `prisma/schema.prisma` 是否变更？变了必须有对应迁移文件。
- [ ] 新增迁移是否已在测试环境跑过一遍？
- [ ] 迁移是否包含 destructive 操作（DROP / RENAME / 删字段）？有就需要用户**逐项确认**。
- [ ] 是否需要 data migration（不只是 schema）？
- [ ] 回滚预案：迁移失败时的恢复路径

### D. 配置与环境变量

- [ ] `.env.example` 是否更新（新增环境变量必须同步示例）
- [ ] 服务器实际 `.env` 是否需要补字段
- [ ] 钉钉 corpId / appKey / appSecret 是否变更
- [ ] 第三方密钥（OSS、签名、回调地址）是否对齐生产值
- [ ] 时区、locale 设置

### E. 核心能力回归（CLAUDE.md 第四节）

逐项点名确认未被破坏：

- [ ] **审批流**：能创建、能审批通过、能驳回、能查记录
- [ ] **收付款**：能创建、能审批、金额计算正确、汇总数对
- [ ] **附件**：能上传、能预览、签名链接有效
- [ ] **登录**：能登录、钉钉免登正常、登出无残留
- [ ] **权限**：跨区域不可见、admin 与普通用户分离

### F. 移动端 + PC 端双端验证

- [ ] 至少一个核心页面在 375px 下手验
- [ ] 至少一个核心页面在 PC 下手验
- [ ] 钉钉内嵌打开正常

### G. 监控与回滚

- [ ] 健康检查端点（`/api/health` 或等价）能正确返回
- [ ] 部署脚本的 `HEALTH_TIMEOUT_SECONDS` 是否够用
- [ ] PM2 进程命名 `APP_NAME` 与现行一致
- [ ] 回滚路径：`OLD_CWD` 指向的旧版本是否还在 `RELEASES_DIR` 里
- [ ] 日志位置已知，出问题能立即捞

### H. 通知与窗口

- [ ] 用户已知发版时间窗口
- [ ] 是否需要给真实用户做提前通告
- [ ] 是否在业务低峰期

## 输出格式

```
【发布版本】<commit sha + 简述>
【检查通过项】
【未通过项】（带阻断 / 警告标记）
【建议】（go / no-go / 修完 X 再发）
【回滚预案】
```

阻断项任一不通过 = `no-go`。

## 必须遵守

- **不直接执行 `scripts/deploy-server.sh`**。Skill 只负责检查，部署由用户在服务器上手动触发。
- **不在本地直接连生产数据库**。不跑 `prisma db push` 指向生产。
- **不要建议 `--no-verify` 跳 hook**、不要建议 `--force` 强推。
- **不要建议关闭健康检查**或缩短超时来"加速部署"。
- 任何 destructive DB 操作都必须用户**显式同意 + 留有回滚脚本**才放行。

## 输出节制

- 检查报告 ≤ 80 行
- 不通过项必须给出"怎么修"的最小指引（一两行）
- 不复述检查清单全文，只列结果

## 关联

- `scripts/deploy-server.sh`：当前部署脚本（不要在 Skill 中改）
- `CLAUDE.md` 第四、五、六节：核心能力 / 数据库 / 检查命令
- `.claude/skills/branch-stabilize/SKILL.md`：分支体检（合并前）
- `.claude/skills/project-audit/SKILL.md`：审计（必要时回头查）
