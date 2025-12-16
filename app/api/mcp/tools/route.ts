import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcpClientManager';

// GET: 서버의 Tools 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');

    if (!serverId) {
      return NextResponse.json(
        { error: 'serverId is required' },
        { status: 400 }
      );
    }

    const client = mcpClientManager.getClient(serverId);
    if (!client) {
      return NextResponse.json(
        { error: 'Server not connected' },
        { status: 400 }
      );
    }

    const tools = await client.listTools();
    return NextResponse.json({ tools });
  } catch (error) {
    console.error('Failed to list tools:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to list tools',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

// POST: Tool 실행
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, toolName, arguments: toolArgs } = body;

    if (!serverId || !toolName) {
      return NextResponse.json(
        { error: 'serverId and toolName are required' },
        { status: 400 }
      );
    }

    const client = mcpClientManager.getClient(serverId);
    if (!client) {
      return NextResponse.json(
        { error: 'Server not connected' },
        { status: 400 }
      );
    }

    const result = await client.callTool({
      name: toolName,
      arguments: toolArgs || {},
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Failed to call tool:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to call tool',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

