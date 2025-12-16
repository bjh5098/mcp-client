'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Server, Settings } from 'lucide-react';
import MarkdownMessage from '@/components/MarkdownMessage';
import ChatSidebar from '@/components/ChatSidebar';
import MCPSidebar from '@/components/MCPSidebar';
import FunctionCallDisplay from '@/components/FunctionCallDisplay';
import { useMCP } from '@/contexts/MCPContext';
import { getMCPServers } from '@/lib/mcpStorage';
import {
  getChatRooms,
  getChatRoom,
  createChatRoom,
  updateChatRoom,
  getCurrentChatRoomId,
  setCurrentChatRoomId,
  type Message,
} from '@/lib/chatStorage';

type SidebarTab = 'chat' | 'mcp';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [currentChatRoomId, setCurrentChatRoomIdState] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('chat');
  const [enabledServerIds, setEnabledServerIds] = useState<Set<string>>(new Set());
  const [showMCPSettings, setShowMCPSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { statuses } = useMCP();

  // 초기 로드: 현재 채팅방 또는 첫 번째 채팅방 로드
  useEffect(() => {
    const savedCurrentId = getCurrentChatRoomId();
    const rooms = getChatRooms();
    
    if (savedCurrentId && getChatRoom(savedCurrentId)) {
      // 저장된 현재 채팅방이 있으면 로드
      const room = getChatRoom(savedCurrentId);
      if (room) {
        setMessages(room.messages);
        setCurrentChatRoomIdState(savedCurrentId);
      }
    } else if (rooms.length > 0) {
      // 저장된 채팅방이 없으면 첫 번째 채팅방 로드
      const firstRoom = rooms[0];
      setMessages(firstRoom.messages);
      setCurrentChatRoomIdState(firstRoom.id);
      setCurrentChatRoomId(firstRoom.id);
    } else {
      // 채팅방이 없으면 새로 생성
      const newRoom = createChatRoom();
      setCurrentChatRoomIdState(newRoom.id);
      setCurrentChatRoomId(newRoom.id);
    }
  }, []);

  // 메시지 변경 시 현재 채팅방에 저장 (빈 배열이 아닐 때만)
  useEffect(() => {
    if (currentChatRoomId && messages.length > 0) {
      updateChatRoom(currentChatRoomId, messages);
      // 사이드바 업데이트를 위한 커스텀 이벤트 발생
      window.dispatchEvent(new Event('chatRoomsUpdated'));
    }
  }, [messages, currentChatRoomId]);

  // 스크롤을 맨 아래로 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const [mcpServers, setMcpServers] = useState<Record<string, { name: string }>>({});

  // MCP 서버 목록 로드
  useEffect(() => {
    const loadServers = async () => {
      try {
        const servers = getMCPServers();
        const serversMap: Record<string, { name: string }> = {};
        servers.forEach((server) => {
          serversMap[server.id] = { name: server.name };
        });
        setMcpServers(serversMap);
      } catch (error) {
        console.error('Failed to load MCP servers:', error);
      }
    };
    loadServers();
  }, []);

  // 활성화된 서버 ID 목록 로드
  useEffect(() => {
    const saved = localStorage.getItem('enabledMCPServers');
    if (saved) {
      try {
        const ids = JSON.parse(saved) as string[];
        setEnabledServerIds(new Set(ids));
      } catch (error) {
        console.error('Failed to load enabled MCP servers:', error);
      }
    }
  }, []);

  // 활성화된 서버 ID 목록 저장
  useEffect(() => {
    if (enabledServerIds.size > 0) {
      localStorage.setItem('enabledMCPServers', JSON.stringify(Array.from(enabledServerIds)));
    } else {
      localStorage.removeItem('enabledMCPServers');
    }
  }, [enabledServerIds]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setStreamingText('');

    try {
      // 활성화된 서버 중 연결된 서버만 필터링
      const activeServerIds = Array.from(enabledServerIds).filter(
        serverId => statuses[serverId]?.connected
      );

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          enabledServerIds: activeServerIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to generate response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.text || '',
        ...(data.functionCalls && { functionCalls: data.functionCalls }),
        ...(data.functionCallResults && { functionCallResults: data.functionCallResults }),
      };

      setMessages([...newMessages, assistantMessage]);
      setStreamingText('');
    } catch (error) {
      console.error('Error:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setStreamingText('');
    }
  };

  const toggleServerEnabled = (serverId: string) => {
    setEnabledServerIds(prev => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
      }
      return next;
    });
  };

  // 채팅방 선택 핸들러
  const handleSelectChatRoom = (id: string) => {
    const room = getChatRoom(id);
    if (room) {
      setMessages(room.messages);
      setCurrentChatRoomIdState(id);
      setCurrentChatRoomId(id);
      setStreamingText('');
    }
  };

  // 새 채팅방 생성 핸들러
  const handleCreateChatRoom = () => {
    const newRoom = createChatRoom();
    setMessages([]);
    setCurrentChatRoomIdState(newRoom.id);
    setCurrentChatRoomId(newRoom.id);
    setStreamingText('');
    // 사이드바 업데이트를 위한 커스텀 이벤트 발생
    window.dispatchEvent(new Event('chatRoomsUpdated'));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-black">
      {/* 사이드바 */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col">
        {/* 탭 헤더 */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setSidebarTab('chat')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              sidebarTab === 'chat'
                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-950'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            채팅
          </button>
          <button
            onClick={() => setSidebarTab('mcp')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              sidebarTab === 'mcp'
                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-b-2 border-zinc-900 dark:border-zinc-50'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-950'
            }`}
          >
            <Server className="w-4 h-4" />
            MCP
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="flex-1 overflow-hidden">
          {sidebarTab === 'chat' ? (
            <ChatSidebar
              currentChatRoomId={currentChatRoomId}
              onSelectChatRoom={handleSelectChatRoom}
              onCreateChatRoom={handleCreateChatRoom}
            />
          ) : (
            <MCPSidebar />
          )}
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              AI 채팅
            </h1>
            <button
              onClick={() => setShowMCPSettings(!showMCPSettings)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-sm"
            >
              <Settings className="w-4 h-4" />
              MCP 도구 설정
            </button>
          </div>
          {showMCPSettings && (
            <div className="max-w-4xl mx-auto mt-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                활성화된 MCP 서버:
              </div>
              <div className="space-y-2">
                {Object.keys(statuses).length === 0 ? (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    연결된 MCP 서버가 없습니다. MCP 탭에서 서버를 추가하고 연결하세요.
                  </div>
                ) : (
                  Object.entries(statuses)
                    .filter(([_, status]) => status.connected)
                    .map(([serverId, status]) => {
                      const isEnabled = enabledServerIds.has(serverId);
                      return (
                        <label
                          key={serverId}
                          className="flex items-center gap-2 cursor-pointer text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={() => toggleServerEnabled(serverId)}
                            className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-50 focus:ring-zinc-400 dark:focus:ring-zinc-600"
                          />
                          <span className={isEnabled ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'}>
                            {mcpServers[serverId]?.name || serverId} {isEnabled && '(활성화됨)'}
                          </span>
                        </label>
                      );
                    })
                )}
                {Object.values(statuses).filter(s => s.connected).length === 0 && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    연결된 MCP 서버가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {/* 채팅 메시지 영역 */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 dark:text-zinc-400 mt-12">
              <p className="text-lg mb-2">안녕하세요! 무엇을 도와드릴까요?</p>
              <p className="text-sm">메시지를 입력하고 Enter를 눌러 전송하세요.</p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-zinc-900 dark:bg-zinc-800 text-white'
                    : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {message.role === 'assistant' ? (
                  <>
                    <MarkdownMessage content={message.content} />
                    {(message.functionCalls || message.functionCallResults) && (
                      <FunctionCallDisplay
                        functionCalls={message.functionCalls}
                        functionCallResults={message.functionCallResults}
                      />
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                )}
              </div>
            </div>
          ))}

          {streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg px-4 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border border-zinc-200 dark:border-zinc-800">
                <MarkdownMessage content={streamingText} isStreaming={true} />
              </div>
            </div>
          )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 입력 영역 */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="메시지를 입력하세요... (Shift+Enter로 줄바꿈)"
                className="flex-1 min-h-[60px] max-h-[200px] px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 resize-none"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white font-medium hover:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '전송 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
