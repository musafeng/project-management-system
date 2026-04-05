import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'financial-summary 暂未实现',
  }, { status: 501 })
}
