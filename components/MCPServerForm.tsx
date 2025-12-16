'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { MCPServerConfig, TransportType } from '@/lib/mcpStorage';

interface MCPServerFormProps {
  server?: MCPServerConfig | null;
  onSave: (config: Omit<MCPServerConfig, 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export default function MCPServerForm({ server, onSave, onCancel }: MCPServerFormProps) {
  const [name, setName] = useState(server?.name || '');
  const [transport, setTransport] = useState<TransportType>(server?.transport || 'stdio');
  const [stdioCommand, setStdioCommand] = useState(server?.stdio?.command || '');
  const [stdioArgs, setStdioArgs] = useState(server?.stdio?.args?.join(' ') || '');
  const [stdioEnv, setStdioEnv] = useState(JSON.stringify(server?.stdio?.env || {}, null, 2));
  const [httpUrl, setHttpUrl] = useState(server?.http?.url || '');
  const [httpHeaders, setHttpHeaders] = useState(JSON.stringify(server?.http?.headers || {}, null, 2));
  const [sseUrl, setSseUrl] = useState(server?.sse?.url || '');
  const [sseHeaders, setSseHeaders] = useState(JSON.stringify(server?.sse?.headers || {}, null, 2));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let stdio, http, sse;

    if (transport === 'stdio') {
      try {
        stdio = {
          command: stdioCommand,
          args: stdioArgs ? stdioArgs.split(' ').filter(Boolean) : undefined,
          env: stdioEnv ? JSON.parse(stdioEnv) : undefined,
        };
      } catch (error) {
        alert('STDIO 환경 변수 JSON 형식이 올바르지 않습니다.');
        return;
      }
    } else if (transport === 'streamable-http') {
      try {
        http = {
          url: httpUrl,
          headers: httpHeaders ? JSON.parse(httpHeaders) : undefined,
        };
      } catch (error) {
        alert('HTTP 헤더 JSON 형식이 올바르지 않습니다.');
        return;
      }
    } else if (transport === 'sse') {
      try {
        sse = {
          url: sseUrl,
          headers: sseHeaders ? JSON.parse(sseHeaders) : undefined,
        };
      } catch (error) {
        alert('SSE 헤더 JSON 형식이 올바르지 않습니다.');
        return;
      }
    }

    onSave({
      id: server?.id || `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      transport,
      ...(stdio && { stdio }),
      ...(http && { http }),
      ...(sse && { sse }),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            {server ? '서버 수정' : '서버 추가'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              서버 이름
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Transport 타입
            </label>
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value as TransportType)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
            >
              <option value="stdio">STDIO</option>
              <option value="streamable-http">Streamable HTTP</option>
              <option value="sse">SSE</option>
            </select>
          </div>

          {transport === 'stdio' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Command
                </label>
                <input
                  type="text"
                  value={stdioCommand}
                  onChange={(e) => setStdioCommand(e.target.value)}
                  required
                  placeholder="예: node"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Args (공백으로 구분)
                </label>
                <input
                  type="text"
                  value={stdioArgs}
                  onChange={(e) => setStdioArgs(e.target.value)}
                  placeholder="예: server.js"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  환경 변수 (JSON)
                </label>
                <textarea
                  value={stdioEnv}
                  onChange={(e) => setStdioEnv(e.target.value)}
                  rows={4}
                  placeholder='{"KEY": "value"}'
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-mono text-sm"
                />
              </div>
            </>
          )}

          {transport === 'streamable-http' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={httpUrl}
                  onChange={(e) => setHttpUrl(e.target.value)}
                  required
                  placeholder="예: http://localhost:3000/mcp"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  헤더 (JSON)
                </label>
                <textarea
                  value={httpHeaders}
                  onChange={(e) => setHttpHeaders(e.target.value)}
                  rows={4}
                  placeholder='{"Authorization": "Bearer token"}'
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-mono text-sm"
                />
              </div>
            </>
          )}

          {transport === 'sse' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={sseUrl}
                  onChange={(e) => setSseUrl(e.target.value)}
                  required
                  placeholder="예: http://localhost:3000/mcp"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  헤더 (JSON)
                </label>
                <textarea
                  value={sseHeaders}
                  onChange={(e) => setSseHeaders(e.target.value)}
                  rows={4}
                  placeholder='{"Authorization": "Bearer token"}'
                  className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-mono text-sm"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

