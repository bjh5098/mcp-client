import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, FunctionCallingConfigMode, mcpToTool } from '@google/genai';
import { mcpClientManager } from '@/lib/mcpClientManager';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  enabledServerIds?: string[]; // 활성화된 MCP 서버 ID 목록
}

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionCallResult {
  name: string;
  result: any;
}

export interface ChatResponse {
  text: string;
  functionCalls?: FunctionCall[];
  functionCallResults?: FunctionCallResult[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, enabledServerIds = [] } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not set' },
        { status: 500 }
      );
    }

    const modelName = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash';

    const ai = new GoogleGenAI({ apiKey });

    // 활성화된 MCP 서버의 클라이언트 가져오기
    const mcpClients: any[] = [];
    if (enabledServerIds.length > 0) {
      for (const serverId of enabledServerIds) {
        const client = mcpClientManager.getClient(serverId);
        if (client) {
          mcpClients.push(client);
        }
      }
    }

    // 히스토리 변환
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // 마지막 메시지 (사용자 입력)
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    // MCP 도구 설정
    const tools = mcpClients.length > 0 ? mcpClients.map(client => mcpToTool(client)) : undefined;

    // 채팅 세션 생성
    const chat = ai.chats.create({
      model: modelName,
      history: history.length > 0 ? history : undefined,
    });

    // 스트리밍 응답 수집
    let fullResponse = '';
    const functionCalls: FunctionCall[] = [];
    const functionCallResults: FunctionCallResult[] = [];

    const response = await chat.sendMessageStream({
      message: lastMessage.content,
      config: tools ? {
        tools,
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        },
      } : undefined,
    });

    for await (const chunk of response) {
      // 텍스트 응답
      if (chunk.text) {
        fullResponse += chunk.text;
      }

      // 함수 호출 정보 수집
      if (chunk.functionCalls) {
        for (const funcCall of chunk.functionCalls) {
          functionCalls.push({
            name: funcCall.name,
            arguments: funcCall.args || {},
          });
        }
      }

      // 함수 호출 결과 수집
      if (chunk.functionResponses) {
        for (const funcResponse of chunk.functionResponses) {
          functionCallResults.push({
            name: funcResponse.name,
            result: funcResponse.response,
          });
        }
      }
    }

    const chatResponse: ChatResponse = {
      text: fullResponse,
      ...(functionCalls.length > 0 && { functionCalls }),
      ...(functionCallResults.length > 0 && { functionCallResults }),
    };

    return NextResponse.json(chatResponse);
  } catch (error) {
    console.error('Chat API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

