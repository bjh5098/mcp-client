import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcpClientManager';

// GET: 서버의 Prompts 목록 조회
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

    const prompts = await client.listPrompts();
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Failed to list prompts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to list prompts',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

// POST: Prompt 가져오기
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serverId, promptName, arguments: promptArgs } = body;

    if (!serverId || !promptName) {
      return NextResponse.json(
        { error: 'serverId and promptName are required' },
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

    const prompt = await client.getPrompt({
      name: promptName,
      arguments: promptArgs || {},
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Failed to get prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to get prompt',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

