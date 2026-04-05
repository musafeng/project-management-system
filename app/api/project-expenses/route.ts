import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { success: false, message: 'project-expenses 暂未实现' },
    { status: 501 }
  )
}

export async function POST() {
  return NextResponse.json(
    { success: false, message: 'project-expenses 暂未实现' },
    { status: 501 }
  )
}
