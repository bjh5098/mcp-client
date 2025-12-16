export type TransportType = 'stdio' | 'streamable-http' | 'sse';

export interface STDIOConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface HTTPConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface SSEConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: TransportType;
  stdio?: STDIOConfig;
  http?: HTTPConfig;
  sse?: SSEConfig;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY_MCP_SERVERS = 'mcpServers';

// 서버 등록/조회는 클라이언트 localStorage가 단일 소스-오브-트루스
function loadServersFromLocalStorage(): MCPServerConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_MCP_SERVERS);
    if (!data) return [];
    return JSON.parse(data) as MCPServerConfig[];
  } catch (error) {
    console.error('Failed to load servers from localStorage:', error);
    return [];
  }
}

function saveServersToLocalStorage(servers: MCPServerConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_MCP_SERVERS, JSON.stringify(servers));
  } catch (error) {
    console.error('Failed to save servers to localStorage:', error);
  }
}

// 모든 MCP 서버 조회 (서버/클라이언트 모두 지원)
export function getMCPServers(): MCPServerConfig[] {
  return loadServersFromLocalStorage();
}

// 특정 MCP 서버 조회 (서버/클라이언트 모두 지원)
export function getMCPServer(id: string): MCPServerConfig | null {
  const servers = loadServersFromLocalStorage();
  return servers.find(server => server.id === id) || null;
}

// MCP 서버 저장 (등록/수정) - 서버/클라이언트 모두 지원
export function saveMCPServer(
  config: Omit<MCPServerConfig, 'createdAt' | 'updatedAt'>
): MCPServerConfig {
  const servers = loadServersFromLocalStorage();
  const existingIndex = servers.findIndex(s => s.id === config.id);
  const now = Date.now();
  const serverConfig: MCPServerConfig = {
    ...config,
    createdAt: existingIndex >= 0 ? servers[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    servers[existingIndex] = serverConfig;
  } else {
    servers.push(serverConfig);
  }

  saveServersToLocalStorage(servers);
  return serverConfig;
}

// MCP 서버 삭제 - 서버/클라이언트 모두 지원
export function deleteMCPServer(id: string): void {
  const servers = loadServersFromLocalStorage();
  const filtered = servers.filter(s => s.id !== id);
  saveServersToLocalStorage(filtered);
}

// 설정 내보내기 - 서버/클라이언트 모두 지원
export function exportMCPServers(): string {
  const servers = loadServersFromLocalStorage();
  return JSON.stringify(servers, null, 2);
}

// 설정 가져오기 - 서버/클라이언트 모두 지원
export function importMCPServers(json: string): MCPServerConfig[] {
  try {
    const servers = JSON.parse(json) as MCPServerConfig[];

    if (!Array.isArray(servers)) {
      throw new Error('Invalid format: expected array');
    }

    const now = Date.now();
    const importedServers = servers.map(server => ({
      ...server,
      id: server.id || `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: server.createdAt || now,
      updatedAt: now,
    }));

    const existingServers = loadServersFromLocalStorage();
    const merged = [...existingServers];

    importedServers.forEach(imported => {
      const existingIndex = merged.findIndex(s => s.id === imported.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = imported;
      } else {
        merged.push(imported);
      }
    });

    saveServersToLocalStorage(merged);
    return merged;
  } catch (error) {
    console.error('Failed to import MCP servers:', error);
    throw error;
  }
}

