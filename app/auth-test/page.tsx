'use client'

import { useEffect, useState } from 'react'
import { isDingTalkEnvironment, getAuthCode, getCurrentUser as getDingTalkUser } from '@/lib/dingtalk-client'
import { getCurrentAuthUser } from '@/lib/auth-client'

interface StepResult {
  label: string
  status: 'pending' | 'ok' | 'error' | 'skip'
  detail?: string
}

export default function AuthTestPage() {
  const [steps, setSteps] = useState<StepResult[]>([
    { label: '1. 检测钉钉环境', status: 'pending' },
    { label: '2. 获取 authCode', status: 'pending' },
    { label: '3. POST /api/auth/dingtalk', status: 'pending' },
    { label: '4. GET /api/auth/me', status: 'pending' },
    { label: '5. Cookie 写入验证', status: 'pending' },
  ])
  const [running, setRunning] = useState(false)

  const update = (index: number, patch: Partial<StepResult>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const runTest = async () => {
    setRunning(true)
    // reset
    setSteps([
      { label: '1. 检测钉钉环境', status: 'pending' },
      { label: '2. 获取 authCode', status: 'pending' },
      { label: '3. POST /api/auth/dingtalk', status: 'pending' },
      { label: '4. GET /api/auth/me', status: 'pending' },
      { label: '5. Cookie 写入验证', status: 'pending' },
    ])

    // Step 1: 检测钉钉环境
    const isDT = isDingTalkEnvironment()
    update(0, {
      status: isDT ? 'ok' : 'error',
      detail: isDT
        ? `检测到钉钉环境（window.dd=${!!(window as any).dd}）`
        : `非钉钉环境（window.dd=${!!(window as any).dd}，UA=${navigator.userAgent.slice(0, 80)}）`,
    })

    if (!isDT) {
      // 非钉钉环境，跳过后续步骤，但仍测试 me 接口
      update(1, { status: 'skip', detail: '非钉钉环境，跳过获取 authCode' })
      update(2, { status: 'skip', detail: '非钉钉环境，跳过' })
      // 仍然测试 me 接口
      await testMeApi(3, 4)
      setRunning(false)
      return
    }

    // Step 2: 获取 authCode
    let code = ''
    try {
      code = await getAuthCode()
      update(1, { status: 'ok', detail: `authCode 获取成功: ${code.slice(0, 12)}...` })
    } catch (err) {
      update(1, { status: 'error', detail: `authCode 获取失败: ${err instanceof Error ? err.message : String(err)}` })
      update(2, { status: 'skip', detail: '因 authCode 失败，跳过' })
      await testMeApi(3, 4)
      setRunning(false)
      return
    }

    // Step 3: POST /api/auth/dingtalk
    try {
      const res = await fetch('/api/auth/dingtalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (json.success) {
        update(2, {
          status: 'ok',
          detail: `登录成功：${json.data?.name}（${json.data?.systemRole}）`,
        })
      } else {
        update(2, {
          status: 'error',
          detail: `接口返回失败: ${json.error || JSON.stringify(json)}`,
        })
      }
    } catch (err) {
      update(2, { status: 'error', detail: `网络请求失败: ${err instanceof Error ? err.message : String(err)}` })
    }

    // Step 4 & 5: 测试 me 接口
    await testMeApi(3, 4)
    setRunning(false)
  }

  const testMeApi = async (meIdx: number, cookieIdx: number) => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success && json.data) {
        update(meIdx, {
          status: 'ok',
          detail: `me 返回：${JSON.stringify(json.data)}`,
        })
        update(cookieIdx, {
          status: 'ok',
          detail: `Cookie 有效，userid=${json.data.userid}，role=${json.data.systemRole}`,
        })
      } else {
        update(meIdx, {
          status: 'error',
          detail: `me 接口失败: ${json.error || JSON.stringify(json)}（HTTP ${res.status}）`,
        })
        update(cookieIdx, {
          status: 'error',
          detail: 'Cookie 未写入或无法读取',
        })
      }
    } catch (err) {
      update(meIdx, { status: 'error', detail: `me 请求异常: ${err instanceof Error ? err.message : String(err)}` })
      update(cookieIdx, { status: 'error', detail: 'Cookie 状态未知' })
    }
  }

  const colorMap: Record<StepResult['status'], string> = {
    pending: '#8c8c8c',
    ok: '#52c41a',
    error: '#f5222d',
    skip: '#faad14',
  }

  const emojiMap: Record<StepResult['status'], string> = {
    pending: '⏳',
    ok: '✅',
    error: '❌',
    skip: '⏭️',
  }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto', fontFamily: 'monospace' }}>
      <h2 style={{ marginBottom: 16 }}>钉钉登录链路调试</h2>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 16 }}>
        UA: {typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 100) : '-'}
      </div>

      <button
        onClick={runTest}
        disabled={running}
        style={{
          padding: '8px 24px',
          background: '#1677ff',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: running ? 'not-allowed' : 'pointer',
          marginBottom: 24,
          fontSize: 14,
        }}
      >
        {running ? '测试中...' : '开始测试'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              padding: '12px 16px',
              background: '#fafafa',
              border: `1px solid ${colorMap[step.status]}`,
              borderRadius: 6,
            }}
          >
            <div style={{ fontWeight: 600, color: colorMap[step.status] }}>
              {emojiMap[step.status]} {step.label}
            </div>
            {step.detail && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 12,
                  color: '#333',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {step.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
