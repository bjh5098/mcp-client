'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

interface MCPToolCardProps {
  tool: Tool;
  serverId: string;
}

export default function MCPToolCard({ tool, serverId }: MCPToolCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [argumentsJson, setArgumentsJson] = useState('{}');

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const args = argumentsJson ? JSON.parse(argumentsJson) : {};
      
      const response = await fetch('/api/mcp/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          toolName: tool.name,
          arguments: args,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Tool execution failed');
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{tool.name}</h3>
        {tool.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{tool.description}</p>
        )}
      </div>

      {tool.inputSchema && (
        <div>
          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
            Arguments (JSON)
          </label>
          <textarea
            value={argumentsJson}
            onChange={(e) => setArgumentsJson(e.target.value)}
            rows={3}
            className="w-full px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-mono"
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      <button
        onClick={handleExecute}
        disabled={isExecuting}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50"
      >
        {isExecuting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        실행
      </button>

      {error && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 text-sm">
          <div className="font-medium mb-1">결과:</div>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

