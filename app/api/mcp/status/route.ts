import { NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcpClientManager';

// GET: 모든 서버 연결 상태 조회
export async function GET() {
  try {
    const statuses = await mcpClientManager.getAllStatuses();
    return NextResponse.json({ statuses });
  } catch (error) {
    console.error('Failed to get MCP server statuses:', error);
    return NextResponse.json(
      { error: 'Failed to get MCP server statuses' },
      { status: 500 }
    );
  }
}

