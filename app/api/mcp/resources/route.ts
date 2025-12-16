import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcpClientManager';

// GET: 서버의 Resources 목록 조회
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

    const resources = await client.listResources();
    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Failed to list resources:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to list resources',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

// POST: Resource 읽기
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, uri } = body;

    if (!serverId || !uri) {
      return NextResponse.json(
        { error: 'serverId and uri are required' },
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

    const resource = await client.readResource({ uri });
    return NextResponse.json({ resource });
  } catch (error) {
    console.error('Failed to read resource:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to read resource',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

