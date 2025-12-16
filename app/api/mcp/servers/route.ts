import { NextRequest, NextResponse } from 'next/server';
// 서버 등록/조회는 클라이언트 localStorage에서만 관리됩니다.
export async function GET() {
  return NextResponse.json({
    servers: [],
    note: 'Servers are managed on the client via localStorage.',
  });
}

export async function POST() {
  return NextResponse.json(
    { error: 'Server CRUD is client-managed (localStorage).' },
    { status: 400 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Server CRUD is client-managed (localStorage).' },
    { status: 400 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Server CRUD is client-managed (localStorage).' },
    { status: 400 }
  );
}

