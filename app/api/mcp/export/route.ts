import { NextResponse } from 'next/server';

// 클라이언트(localStorage) 관리이므로 서버 내보내기 API는 사용하지 않음
export async function GET() {
  return NextResponse.json(
    { error: 'Use client-side export from localStorage.' },
    { status: 400 }
  );
}

