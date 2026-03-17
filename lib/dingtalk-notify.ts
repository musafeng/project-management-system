/**
 * 钉钉审批通知工具 v1
 * 使用企业内部应用「发送工作通知」接口
 * 文档：https://open.dingtalk.com/document/orgapp/asynchronous-sending-of-enterprise-notification
 *
 * 通知失败不影响主业务，仅记录日志。
 */

import { getAccessToken } from './dingtalk'
import { serverEnv } from './env'
import { db } from './db'
import { SystemUserRole } from '@prisma/client'

const DINGTALK_API_BASE = 'https://oapi.dingtalk.com'

// ============================================================================
// 基础发送函数
// ============================================================================

/**
 * 工作通知消息内容（text 类型）
 */
export interface WorkNotificationParams {
  /** 接收人钉钉 userid 列表，最多 100 人 */
  useridList: string[]
  /** 消息标题（用于 markdown） */
  title: string
  /** 消息正文（markdown 格式） */
  content: string
}

/**
 * 发送工作通知（markdown 消息）
 * 失败时只打印日志，不抛出错误。
 */
export async function sendWorkNotification(params: WorkNotificationParams): Promise<boolean> {
  const { useridList, title, content } = params

  if (!useridList || useridList.length === 0) {
    console.warn('[钉钉通知] useridList 为空，跳过发送')
    return false
  }

  const agentId = serverEnv.dingtalk.agentId
  if (!agentId) {
    console.warn('[钉钉通知] DINGTALK_AGENT_ID 未配置，跳过发送')
    return false
  }

  try {
    const accessToken = await getAccessToken()

    const body = {
      agent_id: Number(agentId),
      userid_list: useridList.slice(0, 100).join(','),
      msg: {
        msgtype: 'markdown',
        markdown: {
          title,
          text: content,
        },
      },
    }

    const response = await fetch(
      `${DINGTALK_API_BASE}/topapi/message/corpconversation/asyncsend_v2?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )

    const result = await response.json()

    if (result.errcode !== 0) {
      console.error(`[钉钉通知] 发送失败: errcode=${result.errcode}, errmsg=${result.errmsg}`)
      return false
    }

    console.log(`[钉钉通知] 发送成功，taskId=${result.task_id}，接收人: ${useridList.join(',')}`)
    return true
  } catch (error) {
    console.error('[钉钉通知] 发送工作通知异常:', error)
    return false
  }
}

// ============================================================================
// 接收人查询工具
// ============================================================================

/**
 * 获取所有活跃 ADMIN 用户的钉钉 userid
 */
export async function getActiveAdminDingUserIds(): Promise<string[]> {
  try {
    const admins = await db.systemUser.findMany({
      where: {
        role: SystemUserRole.ADMIN,
        isActive: true,
      },
      select: { dingUserId: true },
    })
    return admins.map((u) => u.dingUserId).filter(Boolean)
  } catch (error) {
    console.error('[钉钉通知] 获取 ADMIN 用户列表失败:', error)
    return []
  }
}

/**
 * 合并接收人列表（去重，过滤空值）
 */
function mergeUserIds(...lists: (string | undefined | null)[][]): string[] {
  const all = lists.flat().filter((id): id is string => Boolean(id))
  return [...new Set(all)]
}

// ============================================================================
// 业务通知函数
// ============================================================================

/**
 * 发送「提交审批」通知
 *
 * - 通知对象：所有活跃 ADMIN
 * - 抄送：提交人本人
 *
 * @param submitterDingUserId 提交人的钉钉 userid
 * @param submitterName 提交人姓名
 * @param modelLabel 模块中文名，例如「采购合同」
 * @param resourceId 单据 ID
 */
export async function sendApprovalSubmittedNotification(params: {
  submitterDingUserId: string
  submitterName: string
  modelLabel: string
  resourceId: string
}): Promise<void> {
  const { submitterDingUserId, submitterName, modelLabel, resourceId } = params

  try {
    const adminIds = await getActiveAdminDingUserIds()
    // 接收人 = ADMIN + 提交人本人（抄送）
    const receivers = mergeUserIds(adminIds, [submitterDingUserId])

    if (receivers.length === 0) {
      console.warn('[钉钉通知] 提交审批：无接收人，跳过')
      return
    }

    const title = `【待审批】${modelLabel}`
    const content = [
      `## 【待审批】${modelLabel}`,
      ``,
      `**${submitterName}** 提交了一条 ${modelLabel} 审批`,
      ``,
      `- **单据ID：** ${resourceId}`,
      `- **状态：** 待审批`,
      `- **提交人：** ${submitterName}`,
    ].join('\n')

    await sendWorkNotification({ useridList: receivers, title, content })
  } catch (error) {
    console.error('[钉钉通知] 发送提交审批通知失败:', error)
  }
}

/**
 * 发送「审批通过」通知
 *
 * - 通知对象：提交人本人
 * - 抄送：所有活跃 ADMIN
 *
 * @param submitterDingUserId 提交人的钉钉 userid
 * @param modelLabel 模块中文名
 * @param resourceId 单据 ID
 */
export async function sendApprovalApprovedNotification(params: {
  submitterDingUserId: string
  modelLabel: string
  resourceId: string
}): Promise<void> {
  const { submitterDingUserId, modelLabel, resourceId } = params

  try {
    const adminIds = await getActiveAdminDingUserIds()
    const receivers = mergeUserIds([submitterDingUserId], adminIds)

    if (receivers.length === 0) {
      console.warn('[钉钉通知] 审批通过：无接收人，跳过')
      return
    }

    const title = `【审批通过】${modelLabel}`
    const content = [
      `## 【审批通过】${modelLabel}`,
      ``,
      `你的 ${modelLabel} 单据已**审批通过** ✅`,
      ``,
      `- **单据ID：** ${resourceId}`,
      `- **状态：** 已通过`,
    ].join('\n')

    await sendWorkNotification({ useridList: receivers, title, content })
  } catch (error) {
    console.error('[钉钉通知] 发送审批通过通知失败:', error)
  }
}

/**
 * 发送「审批驳回」通知
 *
 * - 通知对象：提交人本人
 * - 抄送：所有活跃 ADMIN
 *
 * @param submitterDingUserId 提交人的钉钉 userid
 * @param modelLabel 模块中文名
 * @param resourceId 单据 ID
 * @param reason 驳回原因（可选）
 */
export async function sendApprovalRejectedNotification(params: {
  submitterDingUserId: string
  modelLabel: string
  resourceId: string
  reason?: string
}): Promise<void> {
  const { submitterDingUserId, modelLabel, resourceId, reason } = params

  try {
    const adminIds = await getActiveAdminDingUserIds()
    const receivers = mergeUserIds([submitterDingUserId], adminIds)

    if (receivers.length === 0) {
      console.warn('[钉钉通知] 审批驳回：无接收人，跳过')
      return
    }

    const title = `【审批驳回】${modelLabel}`
    const content = [
      `## 【审批驳回】${modelLabel}`,
      ``,
      `你的 ${modelLabel} 单据已**被驳回** ❌`,
      ``,
      `- **单据ID：** ${resourceId}`,
      `- **状态：** 已驳回`,
      reason ? `- **驳回原因：** ${reason}` : '',
    ]
      .filter((line) => line !== '')
      .join('\n')

    await sendWorkNotification({ useridList: receivers, title, content })
  } catch (error) {
    console.error('[钉钉通知] 发送审批驳回通知失败:', error)
  }
}

