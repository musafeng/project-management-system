import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: false,
    message: 'project-expenses/[id] 暂未实现',
  }, { status: 501 })
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    message: 'project-expenses/[id] 暂未实现',
  }, { status: 501 })
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    message: 'project-expenses/[id] 暂未实现',
  }, { status: 501 })
}
