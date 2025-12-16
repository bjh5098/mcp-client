'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Code, CheckCircle, XCircle } from 'lucide-react';

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionCallResult {
  name: string;
  result: any;
}

interface FunctionCallDisplayProps {
  functionCalls?: FunctionCall[];
  functionCallResults?: FunctionCallResult[];
}

export default function FunctionCallDisplay({
  functionCalls = [],
  functionCallResults = [],
}: FunctionCallDisplayProps) {
  const [expanded, setExpanded] = useState(true);

  if (functionCalls.length === 0 && functionCallResults.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            함수 호출 {functionCalls.length > 0 && `(${functionCalls.length})`}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="p-4 space-y-3 bg-white dark:bg-zinc-900">
          {functionCalls.map((funcCall, index) => {
            const result = functionCallResults.find(r => r.name === funcCall.name);
            
            return (
              <div
                key={index}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  {result ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-zinc-300 dark:border-zinc-600 rounded-full animate-pulse" />
                  )}
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {funcCall.name}
                  </span>
                </div>

                <div className="ml-6 space-y-2">
                  <div>
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      인자:
                    </div>
                    <pre className="text-xs bg-zinc-50 dark:bg-zinc-800 p-2 rounded overflow-x-auto">
                      {JSON.stringify(funcCall.arguments, null, 2)}
                    </pre>
                  </div>

                  {result && (
                    <div>
                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        결과:
                      </div>
                      <pre className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

