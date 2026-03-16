import { NextResponse } from 'next/server'
import { getProjectStats } from '../../../lib/stats'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectIdStr = searchParams.get('id')
    if (!projectIdStr) return NextResponse.json({ error: '缺少项目ID参数 (id)' }, { status: 400 })

    const projectId = parseInt(projectIdStr)
    if (isNaN(projectId) || projectId <= 0) return NextResponse.json({ error: '无效的项目ID' }, { status: 400 })

    const stats = await getProjectStats(projectId)
    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('API错误:', error)
    return NextResponse.json({ error: '统计查询失败', message: error.message }, { status: 500 })
  }
}


