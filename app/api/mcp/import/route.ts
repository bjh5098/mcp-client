import { NextResponse } from 'next/server';

// 클라이언트(localStorage) 관리이므로 서버 가져오기 API는 사용하지 않음
export async function POST() {
  return NextResponse.json(
    { error: 'Use client-side import into localStorage.' },
    { status: 400 }
  );
}

