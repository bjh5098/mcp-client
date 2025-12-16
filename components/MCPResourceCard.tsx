'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import type { Resource } from '@modelcontextprotocol/sdk/types.js';

interface MCPResourceCardProps {
  resource: Resource;
  serverId: string;
}

export default function MCPResourceCard({ resource, serverId }: MCPResourceCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRead = async () => {
    setIsLoading(true);
    setError(null);
    setContent(null);

    try {
      const response = await fetch('/api/mcp/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          uri: resource.uri,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to read resource');
      }

      setContent(data.resource);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-500" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{resource.name || resource.uri}</h3>
        </div>
        {resource.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{resource.description}</p>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 font-mono">{resource.uri}</p>
      </div>

      <button
        onClick={handleRead}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileText className="w-4 h-4" />
        )}
        읽기
      </button>

      {error && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {content && (
        <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 text-sm">
          <div className="font-medium mb-1">내용:</div>
          <pre className="text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

