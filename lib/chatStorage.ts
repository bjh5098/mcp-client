export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionCallResult {
  name: string;
  result: any;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  functionCalls?: FunctionCall[];
  functionCallResults?: FunctionCallResult[];
}

export interface ChatRoom {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY_CHAT_ROOMS = 'chatRooms';
const STORAGE_KEY_CURRENT_CHAT_ROOM_ID = 'currentChatRoomId';

// 모든 채팅방 조회
export function getChatRooms(): ChatRoom[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(STORAGE_KEY_CHAT_ROOMS);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load chat rooms:', error);
    return [];
  }
}

// 특정 채팅방 조회
export function getChatRoom(id: string): ChatRoom | null {
  const rooms = getChatRooms();
  return rooms.find(room => room.id === id) || null;
}

// 새 채팅방 생성
export function createChatRoom(name: string = '새 채팅'): ChatRoom {
  const newRoom: ChatRoom = {
    id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  
  const rooms = getChatRooms();
  rooms.unshift(newRoom); // 최신 채팅방을 맨 위에
  localStorage.setItem(STORAGE_KEY_CHAT_ROOMS, JSON.stringify(rooms));
  
  return newRoom;
}

// 채팅방 메시지 업데이트
export function updateChatRoom(id: string, messages: Message[]): void {
  const rooms = getChatRooms();
  const roomIndex = rooms.findIndex(room => room.id === id);
  
  if (roomIndex === -1) {
    console.error('Chat room not found:', id);
    return;
  }
  
  rooms[roomIndex].messages = messages;
  rooms[roomIndex].updatedAt = Date.now();
  
  // 첫 메시지가 있고 채팅방 이름이 "새 채팅"이면 첫 메시지 일부로 이름 변경
  if (messages.length > 0 && rooms[roomIndex].name === '새 채팅') {
    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (firstUserMessage) {
      const namePreview = firstUserMessage.content.slice(0, 20).trim();
      if (namePreview) {
        rooms[roomIndex].name = namePreview;
      }
    }
  }
  
  localStorage.setItem(STORAGE_KEY_CHAT_ROOMS, JSON.stringify(rooms));
}

// 채팅방 이름 업데이트
export function updateChatRoomName(id: string, name: string): void {
  const rooms = getChatRooms();
  const roomIndex = rooms.findIndex(room => room.id === id);
  
  if (roomIndex === -1) {
    console.error('Chat room not found:', id);
    return;
  }
  
  rooms[roomIndex].name = name;
  rooms[roomIndex].updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY_CHAT_ROOMS, JSON.stringify(rooms));
}

// 채팅방 삭제
export function deleteChatRoom(id: string): void {
  const rooms = getChatRooms();
  const filteredRooms = rooms.filter(room => room.id !== id);
  localStorage.setItem(STORAGE_KEY_CHAT_ROOMS, JSON.stringify(filteredRooms));
  
  // 삭제된 채팅방이 현재 선택된 채팅방이면 현재 선택 해제
  const currentId = getCurrentChatRoomId();
  if (currentId === id) {
    localStorage.removeItem(STORAGE_KEY_CURRENT_CHAT_ROOM_ID);
  }
}

// 현재 선택된 채팅방 ID 조회
export function getCurrentChatRoomId(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem(STORAGE_KEY_CURRENT_CHAT_ROOM_ID);
  } catch (error) {
    console.error('Failed to load current chat room ID:', error);
    return null;
  }
}

// 현재 선택된 채팅방 ID 저장
export function setCurrentChatRoomId(id: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_CURRENT_CHAT_ROOM_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_CHAT_ROOM_ID);
    }
  } catch (error) {
    console.error('Failed to save current chat room ID:', error);
  }
}

