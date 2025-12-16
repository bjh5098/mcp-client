'use client';

import { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
  isStreaming?: boolean;
}

// 코드 블록에서 고유 ID 생성 (내용 기반)
function generateCodeId(code: string, index: number): string {
  const hash = code.slice(0, 30).replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '');
  return `code-${index}-${hash}`;
}

export default function MarkdownMessage({ content, isStreaming = false }: MarkdownMessageProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const codeBlockIndexRef = useRef(0);

  const copyToClipboard = async (text: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(codeId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="markdown-content prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        components={{
          // 코드 블록 처리
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            
            if (!inline && match) {
              const codeId = generateCodeId(codeString, codeBlockIndexRef.current++);
              return (
                <div className="relative group">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 dark:bg-zinc-950 rounded-t-lg border-b border-zinc-700">
                    <span className="text-xs text-zinc-400 font-mono">{match[1]}</span>
                    <button
                      onClick={() => copyToClipboard(codeString, codeId)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-700"
                      title="코드 복사"
                    >
                      {copiedCode === codeId ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>복사</span>
                        </>
                      )}
                    </button>
                  </div>
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-b-lg !mt-0 !mb-0"
                    customStyle={{
                      margin: 0,
                      borderRadius: '0 0 0.5rem 0.5rem',
                    }}
                    {...props}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }
            
            // 인라인 코드
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          // 제목 스타일링
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-6 mb-4 text-zinc-900 dark:text-zinc-50">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-5 mb-3 text-zinc-900 dark:text-zinc-50">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-4 mb-2 text-zinc-900 dark:text-zinc-50">{children}</h3>
          ),
          // 리스트 스타일링
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-2 space-y-1 text-zinc-700 dark:text-zinc-300">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-2 space-y-1 text-zinc-700 dark:text-zinc-300">{children}</ol>
          ),
          // 링크 스타일링
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              {children}
            </a>
          ),
          // 인용구 스타일링
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 my-2 italic text-zinc-600 dark:text-zinc-400">
              {children}
            </blockquote>
          ),
          // 테이블 스타일링
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-zinc-300 dark:border-zinc-700">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-zinc-300 dark:border-zinc-700 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 font-semibold text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-zinc-300 dark:border-zinc-700 px-4 py-2">{children}</td>
          ),
          // 단락 스타일링
          p: ({ children }) => (
            <p className="my-2 text-zinc-700 dark:text-zinc-300 leading-relaxed">{children}</p>
          ),
          // 강조 스타일링
          strong: ({ children }) => (
            <strong className="font-semibold text-zinc-900 dark:text-zinc-50">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-zinc-700 dark:text-zinc-300">{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-zinc-400 dark:bg-zinc-500 animate-pulse ml-1" />
      )}
    </div>
  );
}

