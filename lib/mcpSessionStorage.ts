import type { MCPServerConfig } from './mcpStorage';
import type { ConnectionStatus } from './mcpClientManager';

interface SessionData {
  serverId: string;
  connected: boolean;
  connectedAt?: number;
  error?: string;
  config: MCPServerConfig;
}

// 서버 런타임 내에서만 유지되는 메모리 캐시 (파일 I/O 제거)
declare global {
  // eslint-disable-next-line no-var
  var __mcpSessionCache: Map<string, SessionData> | undefined;
}

function getCache(): Map<string, SessionData> {
  if (!global.__mcpSessionCache) {
    global.__mcpSessionCache = new Map();
  }
  return global.__mcpSessionCache;
}

export async function saveSession(
  serverId: string,
  status: ConnectionStatus,
  config: MCPServerConfig
): Promise<void> {
  const cache = getCache();
  const sessionData: SessionData = {
    serverId,
    connected: status.connected,
    connectedAt: status.connectedAt,
    error: status.error,
    config,
  };
  cache.set(serverId, sessionData);
}

export async function loadSession(serverId: string): Promise<SessionData | null> {
  const cache = getCache();
  return cache.get(serverId) || null;
}

export async function loadAllSessions(): Promise<SessionData[]> {
  const cache = getCache();
  return Array.from(cache.values());
}

export async function deleteSession(serverId: string): Promise<void> {
  const cache = getCache();
  cache.delete(serverId);
}

export async function restoreSessions(): Promise<SessionData[]> {
  // 그대로 메모리 캐시 반환 (재시작 시 초기화됨)
  const cache = getCache();
  return Array.from(cache.values());
}

