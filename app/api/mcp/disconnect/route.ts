import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcpClientManager';

// POST: 서버 연결 해제
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: 'serverId is required' },
        { status: 400 }
      );
    }

    await mcpClientManager.disconnectServer(serverId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to disconnect MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect MCP server' },
      { status: 500 }
    );
  }
}

