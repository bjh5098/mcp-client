'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, MessageSquare } from 'lucide-react';
import {
  getChatRooms,
  deleteChatRoom,
  type ChatRoom,
} from '@/lib/chatStorage';

interface ChatSidebarProps {
  currentChatRoomId: string | null;
  onSelectChatRoom: (id: string) => void;
  onCreateChatRoom: () => void;
}

export default function ChatSidebar({
  currentChatRoomId,
  onSelectChatRoom,
  onCreateChatRoom,
}: ChatSidebarProps) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);

  // 채팅방 목록 로드
  useEffect(() => {
    const loadChatRooms = () => {
      setChatRooms(getChatRooms());
    };

    loadChatRooms();

    // localStorage 변경 감지를 위한 이벤트 리스너 (다른 탭에서의 변경)
    const handleStorageChange = () => {
      loadChatRooms();
    };

    // 같은 탭에서의 변경 감지 (커스텀 이벤트)
    const handleChatRoomsUpdated = () => {
      loadChatRooms();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('chatRoomsUpdated', handleChatRoomsUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatRoomsUpdated', handleChatRoomsUpdated);
    };
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (confirm('이 채팅방을 삭제하시겠습니까?')) {
      deleteChatRoom(id);
      const updatedRooms = getChatRooms();
      setChatRooms(updatedRooms);
      
      // 삭제된 채팅방이 현재 선택된 채팅방이면 첫 번째 채팅방으로 전환
      if (currentChatRoomId === id) {
        if (updatedRooms.length > 0) {
          onSelectChatRoom(updatedRooms[0].id);
        }
      }
      
      // 사이드바 업데이트를 위한 커스텀 이벤트 발생
      window.dispatchEvent(new Event('chatRoomsUpdated'));
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } else if (days < 7) {
      return `${days}일 전`;
    } else {
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onCreateChatRoom}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">새 채팅</span>
        </button>
      </div>

      {/* 채팅방 목록 */}
      <div className="flex-1 overflow-y-auto">
        {chatRooms.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>채팅방이 없습니다</p>
            <p className="text-xs mt-1">새 채팅 버튼을 눌러 시작하세요</p>
          </div>
        ) : (
          <div className="p-2">
            {chatRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onSelectChatRoom(room.id)}
                className={`group relative p-3 rounded-lg mb-1 cursor-pointer transition-colors ${
                  currentChatRoomId === room.id
                    ? 'bg-zinc-100 dark:bg-zinc-900'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-950'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {room.name}
                    </p>
                    {room.messages.length > 0 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                        {room.messages[room.messages.length - 1].content.slice(0, 30)}
                        {room.messages[room.messages.length - 1].content.length > 30 ? '...' : ''}
                      </p>
                    )}
                    <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                      {formatTime(room.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, room.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

