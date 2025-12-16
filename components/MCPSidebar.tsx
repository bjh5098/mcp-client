'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Power, PowerOff, Download, Upload, Server, ChevronDown, ChevronRight } from 'lucide-react';
import { useMCP } from '@/contexts/MCPContext';
import MCPServerForm from './MCPServerForm';
import MCPToolCard from './MCPToolCard';
import MCPPromptCard from './MCPPromptCard';
import MCPResourceCard from './MCPResourceCard';
import type { MCPServerConfig } from '@/lib/mcpStorage';
import {
  getMCPServers,
  saveMCPServer,
  deleteMCPServer as removeMCPServer,
  exportMCPServers,
  importMCPServers,
} from '@/lib/mcpStorage';

export default function MCPSidebar() {
  const { statuses, refreshStatuses, isLoading, error: statusError } = useMCP();
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());
  const [tools, setTools] = useState<Record<string, any[]>>({});
  const [prompts, setPrompts] = useState<Record<string, any[]>>({});
  const [resources, setResources] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // 서버 목록 로드
  useEffect(() => {
    loadServers();

    const handleStorageChange = () => {
      loadServers();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadServers = () => {
    const list = getMCPServers();
    setServers(list);
  };

  const handleConnect = async (serverId: string) => {
    try {
      const config = servers.find((s) => s.id === serverId);
      if (!config) {
        alert('서버 설정을 찾을 수 없습니다.');
        return;
      }

      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, config }),
      });

      if (response.ok) {
        // 연결 성공 후 상태 갱신 (약간의 지연을 두어 서버 측 상태 반영 대기)
        await new Promise(resolve => setTimeout(resolve, 100));
        await refreshStatuses();
        if (expandedServers.has(serverId)) {
          loadServerCapabilities(serverId);
        }
      } else {
        const data = await response.json();
        const errorMsg = data.message || data.error || '알 수 없는 오류';
        alert(`연결 실패: ${errorMsg}`);
        // 실패 시에도 상태 갱신하여 에러 상태 반영
        await refreshStatuses();
      }
    } catch (error) {
      alert(`연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnect = async (serverId: string) => {
    try {
      const response = await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId }),
      });

      if (response.ok) {
        refreshStatuses();
        // 연결 해제 시 기능 목록 초기화
        setTools(prev => {
          const next = { ...prev };
          delete next[serverId];
          return next;
        });
        setPrompts(prev => {
          const next = { ...prev };
          delete next[serverId];
          return next;
        });
        setResources(prev => {
          const next = { ...prev };
          delete next[serverId];
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm('이 서버를 삭제하시겠습니까?')) return;

    try {
      // 먼저 연결 해제
      await handleDisconnect(serverId);
      
      await removeMCPServer(serverId);
      loadServers();
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const handleSave = async (config: Omit<MCPServerConfig, 'createdAt' | 'updatedAt'>) => {
    try {
      saveMCPServer(config);
      loadServers();
      setShowForm(false);
      setEditingServer(null);
    } catch (error) {
      alert(`저장 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const toggleExpand = (serverId: string) => {
    setExpandedServers(prev => {
      const next = new Set(prev);
      if (next.has(serverId)) {
        next.delete(serverId);
      } else {
        next.add(serverId);
        // 확장 시 기능 목록 로드
        const status = statuses[serverId];
        if (status?.connected) {
          loadServerCapabilities(serverId);
        }
      }
      return next;
    });
  };

  const loadServerCapabilities = async (serverId: string) => {
    setLoading(prev => ({ ...prev, [serverId]: true }));

    try {
      // Tools 로드
      const toolsRes = await fetch(`/api/mcp/tools?serverId=${serverId}`);
      if (toolsRes.ok) {
        const toolsData = await toolsRes.json();
        // MCP SDK의 listTools()는 { tools: Tool[] } 형태를 반환
        // API는 이를 { tools: { tools: Tool[] } } 형태로 래핑
        const toolsList = Array.isArray(toolsData.tools) 
          ? toolsData.tools 
          : (toolsData.tools?.tools || []);
        setTools(prev => ({ ...prev, [serverId]: toolsList }));
      } else {
        console.error('Failed to load tools:', await toolsRes.text());
      }

      // Prompts 로드
      const promptsRes = await fetch(`/api/mcp/prompts?serverId=${serverId}`);
      if (promptsRes.ok) {
        const promptsData = await promptsRes.json();
        // MCP SDK의 listPrompts()는 { prompts: Prompt[] } 형태를 반환
        const promptsList = Array.isArray(promptsData.prompts)
          ? promptsData.prompts
          : (promptsData.prompts?.prompts || []);
        setPrompts(prev => ({ ...prev, [serverId]: promptsList }));
      } else {
        console.error('Failed to load prompts:', await promptsRes.text());
      }

      // Resources 로드
      const resourcesRes = await fetch(`/api/mcp/resources?serverId=${serverId}`);
      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        // MCP SDK의 listResources()는 { resources: Resource[] } 형태를 반환
        const resourcesList = Array.isArray(resourcesData.resources)
          ? resourcesData.resources
          : (resourcesData.resources?.resources || []);
        setResources(prev => ({ ...prev, [serverId]: resourcesList }));
      } else {
        console.error('Failed to load resources:', await resourcesRes.text());
      }
    } catch (error) {
      console.error('Failed to load capabilities:', error);
    } finally {
      setLoading(prev => ({ ...prev, [serverId]: false }));
    }
  };

  const handleExport = async () => {
    try {
      const json = exportMCPServers();
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mcp-servers.json';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert(`내보내기 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        importMCPServers(text);
        loadServers();
        alert('설정을 가져왔습니다.');
      } catch (error) {
        alert(`가져오기 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    input.click();
  };

  const getStatusColor = (serverId: string) => {
    const status = statuses[serverId];
    if (!status) return 'text-zinc-400';
    if (status.connected) return 'text-green-500';
    if (status.error) return 'text-red-500';
    return 'text-zinc-400';
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Server className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">MCP 서버</h2>
        </div>
        {statusError && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
            {statusError}
          </div>
        )}
        <button
          onClick={() => {
            setEditingServer(null);
            setShowForm(true);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          서버 추가
        </button>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs"
            title="내보내기"
          >
            <Download className="w-3 h-3" />
          </button>
          <button
            onClick={handleImport}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs"
            title="가져오기"
          >
            <Upload className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 서버 목록 */}
      <div className="flex-1 overflow-y-auto p-2">
        {servers.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 dark:text-zinc-400 text-sm">
            <p>서버가 없습니다</p>
            <p className="text-xs mt-1">서버 추가 버튼을 눌러 시작하세요</p>
            {isLoading && (
              <p className="text-xs text-zinc-400 mt-1">상태 확인 중...</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {servers.map((server) => {
              const status = statuses[server.id];
              const isExpanded = expandedServers.has(server.id);
              const isConnected = status?.connected || false;

              return (
                <div
                  key={server.id}
                  className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
                >
                  {/* 서버 헤더 */}
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-950">
                    <div className="flex items-center justify-between mb-1">
                      <button
                        onClick={() => toggleExpand(server.id)}
                        className="flex items-center gap-1 flex-1 text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-500" />
                        )}
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                          {server.name}
                        </span>
                      </button>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(server.id)}`} />
                        {isConnected ? (
                          <button
                            onClick={() => handleDisconnect(server.id)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            title="연결 해제"
                          >
                            <PowerOff className="w-3 h-3 text-red-500" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnect(server.id)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
                            title="연결"
                          >
                            <Power className="w-3 h-3 text-green-500" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingServer(server);
                            setShowForm(true);
                          }}
                          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
                          title="수정"
                        >
                          <Edit className="w-3 h-3 text-zinc-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(server.id)}
                          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800"
                          title="삭제"
                        >
                          <Trash2 className="w-3 h-3 text-zinc-500" />
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {server.transport}
                      {status?.error && (
                        <span className="text-red-500 ml-1">({status.error})</span>
                      )}
                    </div>
                  </div>

                  {/* 확장된 내용 */}
                  {isExpanded && isConnected && (
                    <div className="p-2 space-y-3 bg-white dark:bg-black">
                      {loading[server.id] ? (
                        <div className="text-center text-sm text-zinc-500 py-4">로딩 중...</div>
                      ) : (
                        <>
                          {/* Tools */}
                          {tools[server.id] && tools[server.id].length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                Tools ({tools[server.id].length})
                              </h4>
                              <div className="space-y-2">
                                {tools[server.id].map((tool) => (
                                  <MCPToolCard key={tool.name} tool={tool} serverId={server.id} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Prompts */}
                          {prompts[server.id] && prompts[server.id].length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                Prompts ({prompts[server.id].length})
                              </h4>
                              <div className="space-y-2">
                                {prompts[server.id].map((prompt) => (
                                  <MCPPromptCard key={prompt.name} prompt={prompt} serverId={server.id} />
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resources */}
                          {resources[server.id] && resources[server.id].length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                Resources ({resources[server.id].length})
                              </h4>
                              <div className="space-y-2">
                                {resources[server.id].map((resource) => (
                                  <MCPResourceCard key={resource.uri} resource={resource} serverId={server.id} />
                                ))}
                              </div>
                            </div>
                          )}

                          {(!tools[server.id] || tools[server.id].length === 0) &&
                            (!prompts[server.id] || prompts[server.id].length === 0) &&
                            (!resources[server.id] || resources[server.id].length === 0) && (
                              <div className="text-center text-xs text-zinc-500 py-4">
                                사용 가능한 기능이 없습니다
                              </div>
                            )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 서버 폼 모달 */}
      {showForm && (
        <MCPServerForm
          server={editingServer}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingServer(null);
          }}
        />
      )}
    </div>
  );
}

