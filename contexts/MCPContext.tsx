'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { ConnectionStatus } from '@/lib/mcpClientManager';

interface MCPContextType {
  statuses: Record<string, ConnectionStatus>;
  refreshStatuses: () => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

export function MCPProvider({ children }: { children: ReactNode }) {
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatuses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/mcp/status');
      if (response.ok) {
        const data = await response.json();
        setStatuses(data.statuses || {});
      } else {
        setError('상태를 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('Failed to refresh MCP statuses:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatuses();
    
    // 주기적으로 상태 갱신 (5초마다)
    const interval = setInterval(refreshStatuses, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <MCPContext.Provider value={{ statuses, refreshStatuses, isLoading, error }}>
      {children}
    </MCPContext.Provider>
  );
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error('useMCP must be used within MCPProvider');
  }
  return context;
}

