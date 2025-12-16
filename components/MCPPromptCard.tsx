'use client';

import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import type { Prompt } from '@modelcontextprotocol/sdk/types.js';

interface MCPPromptCardProps {
  prompt: Prompt;
  serverId: string;
}

export default function MCPPromptCard({ prompt, serverId }: MCPPromptCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [argumentsJson, setArgumentsJson] = useState('{}');

  const handleGetPrompt = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const args = argumentsJson ? JSON.parse(argumentsJson) : {};
      
      const response = await fetch('/api/mcp/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          promptName: prompt.name,
          arguments: args,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to get prompt');
      }

      setResult(data.prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3">
      <div>
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{prompt.name}</h3>
        {prompt.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{prompt.description}</p>
        )}
      </div>

      {prompt.arguments && prompt.arguments.length > 0 && (
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
        onClick={handleGetPrompt}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-zinc-900 dark:bg-zinc-800 text-white hover:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        가져오기
      </button>

      {error && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-900 text-sm">
          <div className="font-medium mb-1">결과:</div>
          <pre className="text-xs overflow-auto whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

