import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { ClientTransport } from '@modelcontextprotocol/sdk/client/types.js';
import type {
  MCPServerConfig,
  TransportType,
} from './mcpStorage';
import {
  saveSession,
  deleteSession,
  restoreSessions,
} from './mcpSessionStorage';

export interface ConnectionStatus {
  connected: boolean;
  error?: string;
  connectedAt?: number;
}

class MCPServerConnection {
  private client: Client | null = null;
  private transport: ClientTransport | null = null;
  private status: ConnectionStatus = { connected: false };
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.status.connected) {
      return;
    }

    try {
      this.client = new Client({
        name: 'mcp-chat-client',
        version: '1.0.0',
      });

      this.transport = this.createTransport(this.config);

      await this.client.connect(this.transport);
      
      this.status = {
        connected: true,
        connectedAt: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.status = {
        connected: false,
        error: errorMessage,
      };
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      if (this.transport) {
        this.transport = null;
      }
      this.status = { connected: false };
    } catch (error) {
      console.error('Error disconnecting:', error);
      this.status = {
        connected: false,
        error: error instanceof Error ? error.message : 'Disconnect error',
      };
    }
  }

  getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  getClient(): Client | null {
    return this.client;
  }

  private createTransport(config: MCPServerConfig): ClientTransport {
    switch (config.transport) {
      case 'stdio':
        if (!config.stdio) {
          throw new Error('STDIO config is required for stdio transport');
        }
        return new StdioClientTransport({
          command: config.stdio.command,
          args: config.stdio.args,
          env: config.stdio.env,
        });

      case 'streamable-http':
        if (!config.http) {
          throw new Error('HTTP config is required for streamable-http transport');
        }
        return new StreamableHTTPClientTransport(
          new URL(config.http.url),
          {
            headers: config.http.headers,
          }
        );

      case 'sse':
        // SSE는 deprecated되었지만, StreamableHTTP가 자동으로 fallback을 지원할 수 있음
        // 또는 별도의 SSE 클라이언트를 사용할 수 있음
        // 여기서는 StreamableHTTP를 사용하되, SSE 엔드포인트로 연결
        if (!config.sse) {
          throw new Error('SSE config is required for sse transport');
        }
        // SSE는 StreamableHTTP와 유사하게 처리
        // 실제로는 StreamableHTTP 클라이언트가 SSE를 지원할 수 있음
        return new StreamableHTTPClientTransport(
          new URL(config.sse.url),
          {
            headers: config.sse.headers,
          }
        );

      default:
        throw new Error(`Unsupported transport type: ${config.transport}`);
    }
  }
}

// 전역 연결 저장소 (Node.js global 객체 사용)
declare global {
  // eslint-disable-next-line no-var
  var __mcpConnections: Map<string, MCPServerConnection> | undefined;
  // eslint-disable-next-line no-var
  var __mcpInitialized: boolean | undefined;
}

class MCPClientManager {
  private static instance: MCPClientManager;
  private initialized = false;

  private constructor() {}

  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  // 전역 연결 맵 가져오기 (서버 측에서만 사용)
  private getConnections(): Map<string, MCPServerConnection> {
    if (typeof window !== 'undefined') {
      // 클라이언트 측에서는 새 Map 사용 (실제로는 서버 측에서만 사용됨)
      return new Map();
    }
    
    // 서버 측: global 객체 사용
    if (!global.__mcpConnections) {
      global.__mcpConnections = new Map();
    }
    return global.__mcpConnections;
  }

  // 초기화 (메모리 캐시만 사용)
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize MCP client manager:', error);
      this.initialized = true; // 실패해도 초기화 완료로 표시하여 재시도 방지
    }
  }

  async connectServer(config: MCPServerConfig): Promise<void> {
    await this.initialize();
    
    const connections = this.getConnections();
    const connection = connections.get(config.id);
    
    if (connection) {
      // 이미 연결되어 있으면 재연결
      await connection.disconnect();
    }

    const newConnection = new MCPServerConnection(config);
    await newConnection.connect();
    connections.set(config.id, newConnection);
    
    // 세션에 저장
    const status = newConnection.getStatus();
    await saveSession(config.id, status, config);
  }

  async disconnectServer(serverId: string): Promise<void> {
    await this.initialize();
    
    const connections = this.getConnections();
    const connection = connections.get(serverId);
    if (connection) {
      await connection.disconnect();
      connections.delete(serverId);
    }
    
    // 세션에서 제거
    await deleteSession(serverId);
  }

  getConnection(serverId: string): MCPServerConnection | null {
    const connections = this.getConnections();
    return connections.get(serverId) || null;
  }

  getClient(serverId: string): Client | null {
    const connections = this.getConnections();
    const connection = connections.get(serverId);
    return connection?.getClient() || null;
  }

  getStatus(serverId: string): ConnectionStatus {
    const connections = this.getConnections();
    const connection = connections.get(serverId);
    return connection?.getStatus() || { connected: false };
  }

  async getAllStatuses(): Promise<Record<string, ConnectionStatus>> {
    await this.initialize();
    
    const connections = this.getConnections();
    const statuses: Record<string, ConnectionStatus> = {};
    connections.forEach((connection, serverId) => {
      statuses[serverId] = connection.getStatus();
    });
    
    // 세션에서도 상태 확인 (연결이 끊어진 경우 대비)
    try {
      const sessions = await restoreSessions();
      sessions.forEach(session => {
        if (!statuses[session.serverId]) {
          statuses[session.serverId] = {
            connected: session.connected,
            connectedAt: session.connectedAt,
            error: session.error,
          };
        }
      });
    } catch (error) {
      console.error('Failed to load statuses from sessions:', error);
    }
    
    return statuses;
  }

  async disconnectAll(): Promise<void> {
    const connections = this.getConnections();
    const disconnectPromises = Array.from(connections.keys()).map(id =>
      this.disconnectServer(id)
    );
    await Promise.all(disconnectPromises);
  }

  // 연결된 모든 MCP 클라이언트 가져오기
  getAllClients(): Client[] {
    const connections = this.getConnections();
    const clients: Client[] = [];
    connections.forEach((connection) => {
      const client = connection.getClient();
      if (client) {
        clients.push(client);
      }
    });
    return clients;
  }
}

export const mcpClientManager = MCPClientManager.getInstance();

