import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcpClientManager';
import type { MCPServerConfig } from '@/lib/mcpStorage';

// POST: 서버 연결
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, config } = body as {
      serverId?: string;
      config?: MCPServerConfig;
    };

    if (!serverId || !config) {
      return NextResponse.json(
        { error: 'serverId and config are required' },
        { status: 400 }
      );
    }

    await mcpClientManager.connectServer(config);
    const status = mcpClientManager.getStatus(serverId);

    return NextResponse.json({ 
      success: true,
      status,
    });
  } catch (error) {
    console.error('Failed to connect MCP server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to connect MCP server',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

