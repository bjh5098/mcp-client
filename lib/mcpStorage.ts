import { promises as fs } from 'fs';
import path from 'path';

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
const SERVER_STORAGE_FILE_PATH = path.join(process.cwd(), '.mcp-servers.json');

// 서버 측: 파일에서 서버 목록 로드
async function loadServersFromFile(): Promise<MCPServerConfig[]> {
  try {
    const data = await fs.readFile(SERVER_STORAGE_FILE_PATH, 'utf-8');
    return JSON.parse(data) as MCPServerConfig[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    console.error('Failed to load servers from file:', error);
    return [];
  }
}

// 서버 측: 파일에 서버 목록 저장
async function saveServersToFile(servers: MCPServerConfig[]): Promise<void> {
  try {
    await fs.writeFile(
      SERVER_STORAGE_FILE_PATH,
      JSON.stringify(servers, null, 2),
      'utf-8'
    );
  } catch (error) {
    console.error('Failed to save servers to file:', error);
  }
}

// 클라이언트 측: localStorage에서 서버 목록 로드
function loadServersFromLocalStorage(): MCPServerConfig[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY_MCP_SERVERS);
    if (!data) return [];
    return JSON.parse(data) as MCPServerConfig[];
  } catch (error) {
    console.error('Failed to load servers from localStorage:', error);
    return [];
  }
}

// 클라이언트 측: localStorage에 서버 목록 저장
function saveServersToLocalStorage(servers: MCPServerConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MCP_SERVERS, JSON.stringify(servers));
  } catch (error) {
    console.error('Failed to save servers to localStorage:', error);
  }
}

// 모든 MCP 서버 조회 (서버/클라이언트 모두 지원)
export async function getMCPServers(): Promise<MCPServerConfig[]>;
export function getMCPServers(): MCPServerConfig[] | Promise<MCPServerConfig[]>;
export function getMCPServers(): MCPServerConfig[] | Promise<MCPServerConfig[]> {
  if (typeof window === 'undefined') {
    // 서버 측: 파일에서 로드
    return loadServersFromFile();
  }
  // 클라이언트 측: localStorage에서 로드
  return loadServersFromLocalStorage();
}

// 특정 MCP 서버 조회 (서버/클라이언트 모두 지원)
export async function getMCPServer(id: string): Promise<MCPServerConfig | null>;
export function getMCPServer(id: string): MCPServerConfig | null | Promise<MCPServerConfig | null>;
export function getMCPServer(id: string): MCPServerConfig | null | Promise<MCPServerConfig | null> {
  if (typeof window === 'undefined') {
    // 서버 측
    return loadServersFromFile().then(servers => 
      servers.find(server => server.id === id) || null
    );
  }
  // 클라이언트 측
  const servers = loadServersFromLocalStorage();
  return servers.find(server => server.id === id) || null;
}

// MCP 서버 저장 (등록/수정) - 서버/클라이언트 모두 지원
export async function saveMCPServer(
  config: Omit<MCPServerConfig, 'createdAt' | 'updatedAt'>
): Promise<MCPServerConfig>;
export function saveMCPServer(
  config: Omit<MCPServerConfig, 'createdAt' | 'updatedAt'>
): MCPServerConfig | Promise<MCPServerConfig>;
export function saveMCPServer(
  config: Omit<MCPServerConfig, 'createdAt' | 'updatedAt'>
): MCPServerConfig | Promise<MCPServerConfig> {
  if (typeof window === 'undefined') {
    // 서버 측
    return loadServersFromFile().then(async servers => {
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
      
      await saveServersToFile(servers);
      return serverConfig;
    });
  }
  
  // 클라이언트 측
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
export async function deleteMCPServer(id: string): Promise<void>;
export function deleteMCPServer(id: string): void | Promise<void>;
export function deleteMCPServer(id: string): void | Promise<void> {
  if (typeof window === 'undefined') {
    // 서버 측
    return loadServersFromFile().then(async servers => {
      const filtered = servers.filter(s => s.id !== id);
      await saveServersToFile(filtered);
    });
  }
  // 클라이언트 측
  const servers = loadServersFromLocalStorage();
  const filtered = servers.filter(s => s.id !== id);
  saveServersToLocalStorage(filtered);
}

// 설정 내보내기 - 서버/클라이언트 모두 지원
export async function exportMCPServers(): Promise<string>;
export function exportMCPServers(): string | Promise<string>;
export function exportMCPServers(): string | Promise<string> {
  if (typeof window === 'undefined') {
    // 서버 측
    return loadServersFromFile().then(servers => 
      JSON.stringify(servers, null, 2)
    );
  }
  // 클라이언트 측
  const servers = loadServersFromLocalStorage();
  return JSON.stringify(servers, null, 2);
}

// 설정 가져오기 - 서버/클라이언트 모두 지원
export async function importMCPServers(json: string): Promise<MCPServerConfig[]>;
export function importMCPServers(json: string): MCPServerConfig[] | Promise<MCPServerConfig[]>;
export function importMCPServers(json: string): MCPServerConfig[] | Promise<MCPServerConfig[]> {
  try {
    const servers = JSON.parse(json) as MCPServerConfig[];
    
    // 유효성 검사
    if (!Array.isArray(servers)) {
      throw new Error('Invalid format: expected array');
    }
    
    // 각 서버에 ID가 없으면 생성
    const now = Date.now();
    const importedServers = servers.map(server => ({
      ...server,
      id: server.id || `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: server.createdAt || now,
      updatedAt: now,
    }));
    
    if (typeof window === 'undefined') {
      // 서버 측
      return loadServersFromFile().then(async existingServers => {
        const merged = [...existingServers];
        
        importedServers.forEach(imported => {
          const existingIndex = merged.findIndex(s => s.id === imported.id);
          if (existingIndex >= 0) {
            merged[existingIndex] = imported;
          } else {
            merged.push(imported);
          }
        });
        
        await saveServersToFile(merged);
        return merged;
      });
    }
    
    // 클라이언트 측
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

