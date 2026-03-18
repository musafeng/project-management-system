'use client'

import { useEffect, useState } from 'react'
import { isDingTalkEnvironment, loadDingTalkSDK, getAuthCode } from '@/lib/dingtalk-client'

interface StepResult {
  label: string
  status: 'pending' | 'ok' | 'error' | 'skip'
  detail?: string
}

const INIT_STEPS: StepResult[] = [
  { label: '1. UA 检测（钉钉环境判断）', status: 'pending' },
  { label: '2. 加载钉钉 JS SDK', status: 'pending' },
  { label: '3. 获取 authCode', status: 'pending' },
  { label: '4. POST /api/auth/dingtalk', status: 'pending' },
  { label: '5. GET /api/auth/me（Cookie 验证）', status: 'pending' },
]

export default function AuthTestPage() {
  const [ua, setUa] = useState('')
  const [steps, setSteps] = useState<StepResult[]>(INIT_STEPS)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    setUa(navigator.userAgent)
  }, [])

  const update = (index: number, patch: Partial<StepResult>) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))

  const runTest = async () => {
    setRunning(true)
    setSteps(INIT_STEPS.map((s) => ({ ...s })))

    // ── Step 1: UA + 环境检测 ──────────────────────────────────
    const hasDDUA = /dingtalk/i.test(navigator.userAgent)
    const hasDDObj = !!(window as any).dd
    const isDT = isDingTalkEnvironment()
    update(0, {
      status: isDT ? 'ok' : 'error',
      detail:
        `UA含dingtalk: ${hasDDUA}\n` +
        `window.dd存在: ${hasDDObj}\n` +
        `综合判断: ${isDT ? '钉钉环境' : '非钉钉环境'}\n` +
        `UA: ${navigator.userAgent}`,
    })

    if (!isDT) {
      update(1, { status: 'skip', detail: '非钉钉环境，跳过 SDK 加载' })
      update(2, { status: 'skip', detail: '非钉钉环境，跳过' })
      update(3, { status: 'skip', detail: '非钉钉环境，跳过' })
      await testMeApi(4)
      setRunning(false)
      return
    }

    // ── Step 2: 加载 SDK ──────────────────────────────────────
    let dd: any = null
    try {
      dd = await loadDingTalkSDK()
      update(1, {
        status: 'ok',
        detail: `SDK 加载成功，window.dd 类型: ${typeof dd}\n方法列表: ${Object.keys(dd || {}).slice(0, 8).join(', ')}...`,
      })
    } catch (err) {
      update(1, {
        status: 'error',
        detail: `SDK 加载失败: ${err instanceof Error ? err.message : String(err)}`,
      })
      update(2, { status: 'skip', detail: '因 SDK 加载失败，跳过' })
      update(3, { status: 'skip', detail: '因 SDK 加载失败，跳过' })
      await testMeApi(4)
      setRunning(false)
      return
    }

    // ── Step 3: 获取 authCode ─────────────────────────────────
    let code = ''
    try {
      code = await getAuthCode()
      update(2, {
        status: 'ok',
        detail: `authCode 获取成功: ${code.slice(0, 16)}...（共 ${code.length} 字符）`,
      })
    } catch (err) {
      update(2, {
        status: 'error',
        detail: `authCode 获取失败: ${err instanceof Error ? err.message : String(err)}`,
      })
      update(3, { status: 'skip', detail: '因 authCode 失败，跳过' })
      await testMeApi(4)
      setRunning(false)
      return
    }

    // ── Step 4: POST /api/auth/dingtalk ───────────────────────
    try {
      const res = await fetch('/api/auth/dingtalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (json.success) {
        update(3, {
          status: 'ok',
          detail:
            `登录成功\n` +
            `用户: ${json.data?.name}（${json.data?.userid}）\n` +
            `角色: ${json.data?.systemRole}\n` +
            `部门: ${(json.data?.deptNames || []).join(', ')}`,
        })
      } else {
        update(3, {
          status: 'error',
          detail: `接口返回失败（HTTP ${res.status}）:\n${json.error || JSON.stringify(json)}`,
        })
      }
    } catch (err) {
      update(3, {
        status: 'error',
        detail: `网络请求异常: ${err instanceof Error ? err.message : String(err)}`,
      })
    }

    // ── Step 5: GET /api/auth/me ──────────────────────────────
    await testMeApi(4)
    setRunning(false)
  }

  const testMeApi = async (idx: number) => {
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
      })
      const json = await res.json()
      if (json.success && json.data) {
        update(idx, {
          status: 'ok',
          detail:
            `Cookie 有效\n` +
            `userid: ${json.data.userid}\n` +
            `name: ${json.data.name}\n` +
            `role: ${json.data.systemRole}\n` +
            `isActive: ${json.data.isActive}`,
        })
      } else {
        update(idx, {
          status: 'error',
          detail: `me 接口失败（HTTP ${res.status}）:\n${json.error || JSON.stringify(json)}`,
        })
      }
    } catch (err) {
      update(idx, {
        status: 'error',
        detail: `me 请求异常: ${err instanceof Error ? err.message : String(err)}`,
      })
    }
  }

  const colorMap: Record<StepResult['status'], string> = {
    pending: '#d9d9d9',
    ok: '#52c41a',
    error: '#f5222d',
    skip: '#faad14',
  }
  const iconMap: Record<StepResult['status'], string> = {
    pending: '○',
    ok: '✓',
    error: '✗',
    skip: '–',
  }

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: '0 auto', fontFamily: 'monospace', fontSize: 13 }}>
      {/* ── 版本标识，用于确认钉钉内是否加载到最新代码 ── */}
      <div
        style={{
          background: '#fadb14',
          color: '#000',
          fontWeight: 700,
          fontSize: 13,
          padding: '6px 14px',
          borderRadius: 4,
          marginBottom: 12,
          letterSpacing: 1,
        }}
      >
        当前调试版本：v2-sdk-debug
      </div>
      <h2 style={{ marginBottom: 8, fontSize: 18 }}>钉钉登录链路调试 v2</h2>

      <div
        style={{
          background: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: 6,
          padding: '10px 14px',
          marginBottom: 16,
          wordBreak: 'break-all',
          fontSize: 11,
          color: '#555',
        }}
      >
        <strong>UA：</strong>{ua || '加载中...'}
      </div>

      <button
        onClick={runTest}
        disabled={running}
        style={{
          padding: '8px 28px',
          background: running ? '#aaa' : '#1677ff',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: running ? 'not-allowed' : 'pointer',
          marginBottom: 20,
          fontSize: 14,
        }}
      >
        {running ? '测试中...' : '开始测试'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              padding: '12px 16px',
              background: '#fafafa',
              border: `1.5px solid ${colorMap[step.status]}`,
              borderRadius: 6,
            }}
          >
            <div style={{ fontWeight: 700, color: colorMap[step.status], fontSize: 13 }}>
              [{iconMap[step.status]}] {step.label}
            </div>
            {step.detail && (
              <pre
                style={{
                  margin: '8px 0 0',
                  fontSize: 11,
                  color: '#333',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  background: '#f0f0f0',
                  padding: '8px',
                  borderRadius: 4,
                }}
              >
                {step.detail}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
