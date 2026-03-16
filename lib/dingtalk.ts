/**
 * 钉钉服务端工具
 * 用于服务端调用钉钉开放平台 API
 */

import { serverEnv } from './env'

/**
 * 钉钉 API 基础地址
 */
const DINGTALK_API_BASE = 'https://oapi.dingtalk.com'

/**
 * 钉钉用户信息
 */
export interface DingTalkUser {
  userid: string
  name: string
  mobile?: string
  unionid?: string
  deptIds?: number[]
  email?: string
  avatar?: string
}

/**
 * 获取企业内部应用 access_token
 * 文档：https://open.dingtalk.com/document/orgapp/obtain-orgapp-token
 */
export async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret } = serverEnv.dingtalk

  if (!clientId || !clientSecret) {
    throw new Error('钉钉配置缺失：clientId 或 clientSecret 未设置')
  }

  try {
    const response = await fetch(
      `${DINGTALK_API_BASE}/gettoken?appkey=${clientId}&appsecret=${clientSecret}`,
      {
        method: 'GET',
      }
    )

    const result = await response.json()

    if (result.errcode !== 0) {
      throw new Error(`获取 access_token 失败: ${result.errmsg}`)
    }

    return result.access_token
  } catch (error) {
    console.error('获取钉钉 access_token 失败:', error)
    throw error
  }
}

/**
 * 通过免登授权码获取用户 userid
 * 文档：https://open.dingtalk.com/document/orgapp/obtain-the-userid-of-a-user-by-using-the-log-free
 */
export async function getUserIdByCode(code: string): Promise<string> {
  const accessToken = await getAccessToken()

  try {
    const response = await fetch(
      `${DINGTALK_API_BASE}/topapi/v2/user/getuserinfo?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      }
    )

    const result = await response.json()

    if (result.errcode !== 0) {
      throw new Error(`获取用户信息失败: ${result.errmsg}`)
    }

    return result.result.userid
  } catch (error) {
    console.error('通过 code 获取 userid 失败:', error)
    throw error
  }
}

/**
 * 获取用户详细信息
 * 文档：https://open.dingtalk.com/document/orgapp/query-user-details
 */
export async function getUserDetail(userid: string): Promise<DingTalkUser> {
  const accessToken = await getAccessToken()

  try {
    const response = await fetch(
      `${DINGTALK_API_BASE}/topapi/v2/user/get?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userid }),
      }
    )

    const result = await response.json()

    if (result.errcode !== 0) {
      throw new Error(`获取用户详情失败: ${result.errmsg}`)
    }

    const user = result.result

    return {
      userid: user.userid,
      name: user.name,
      mobile: user.mobile || undefined,
      unionid: user.unionid || undefined,
      deptIds: user.dept_id_list || undefined,
      email: user.email || undefined,
      avatar: user.avatar || undefined,
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
    throw error
  }
}

/**
 * 通过免登授权码获取完整用户信息（一步到位）
 */
export async function getUserByCode(code: string): Promise<DingTalkUser> {
  // 1. 通过 code 获取 userid
  const userid = await getUserIdByCode(code)

  // 2. 通过 userid 获取用户详情
  const userDetail = await getUserDetail(userid)

  return userDetail
}

