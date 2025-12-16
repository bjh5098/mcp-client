import { promises as fs } from 'fs';
import path from 'path';
import type { MCPServerConfig } from './mcpStorage';
import type { ConnectionStatus } from './mcpClientManager';

interface SessionData {
  serverId: string;
  connected: boolean;
  connectedAt?: number;
  error?: string;
  config: MCPServerConfig;
}

interface SessionFile {
  connections: Record<string, SessionData>;
}

const SESSION_FILE_PATH = path.join(process.cwd(), '.mcp-sessions.json');

// 메모리 캐시
const sessionCache: Map<string, SessionData> = new Map();
let cacheInitialized = false;

// 파일에서 세션 데이터 로드
async function loadSessionFile(): Promise<SessionFile> {
  try {
    const data = await fs.readFile(SESSION_FILE_PATH, 'utf-8');
    return JSON.parse(data) as SessionFile;
  } catch (error) {
    // 파일이 없으면 빈 객체 반환
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { connections: {} };
    }
    console.error('Failed to load session file:', error);
    return { connections: {} };
  }
}

// 파일에 세션 데이터 저장
async function saveSessionFile(sessions: SessionFile): Promise<void> {
  try {
    await fs.writeFile(
      SESSION_FILE_PATH,
      JSON.stringify(sessions, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to save session file:', error);
    // 파일 저장 실패해도 메모리 캐시는 유지
  }
}

// 캐시 초기화 (파일에서 로드)
async function initializeCache(): Promise<void> {
  if (cacheInitialized) return;
  
  const sessionFile = await loadSessionFile();
  sessionCache.clear();
  
  Object.entries(sessionFile.connections).forEach(([serverId, session]) => {
    sessionCache.set(serverId, session);
  });
  
  cacheInitialized = true;
}

// 세션 저장
export async function saveSession(
  serverId: string,
  status: ConnectionStatus,
  config: MCPServerConfig
): Promise<void> {
  await initializeCache();
  
  const sessionData: SessionData = {
    serverId,
    connected: status.connected,
    connectedAt: status.connectedAt,
    error: status.error,
    config,
  };
  
  // 메모리 캐시에 저장
  sessionCache.set(serverId, sessionData);
  
  // 파일에 저장
  const sessionFile = await loadSessionFile();
  sessionFile.connections[serverId] = sessionData;
  await saveSessionFile(sessionFile);
}

// 특정 서버 세션 로드
export async function loadSession(serverId: string): Promise<SessionData | null> {
  await initializeCache();
  return sessionCache.get(serverId) || null;
}

// 모든 세션 로드
export async function loadAllSessions(): Promise<SessionData[]> {
  await initializeCache();
  return Array.from(sessionCache.values());
}

// 세션 삭제
export async function deleteSession(serverId: string): Promise<void> {
  await initializeCache();
  
  // 메모리 캐시에서 제거
  sessionCache.delete(serverId);
  
  // 파일에서 제거
  const sessionFile = await loadSessionFile();
  delete sessionFile.connections[serverId];
  await saveSessionFile(sessionFile);
}

// 모든 세션 복원 (초기화용)
export async function restoreSessions(): Promise<SessionData[]> {
  await initializeCache();
  return Array.from(sessionCache.values());
}

