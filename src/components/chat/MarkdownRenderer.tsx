"use client";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
}

export function MarkdownRenderer({ content, isUser }: MarkdownRendererProps) {
  return (
    <div
      className={`prose prose-sm sm:prose-base max-w-none break-words leading-relaxed ${
        isUser
          ? "prose-invert text-primary-foreground font-semibold"
          : "text-foreground font-medium"
      }`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong
              className={`font-black ${
                isUser ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic opacity-90">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-2 pl-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-2 pl-1">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-lg font-black mt-3 mb-1.5 text-foreground">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-black mt-2.5 mb-1 text-foreground">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-black mt-2 mb-1 text-foreground">{children}</h3>
          ),
          code: ({ children }) => (
            <code
              className={`px-1.5 py-0.5 rounded-md text-xs font-mono font-bold ${
                isUser
                  ? "bg-black/20 text-white"
                  : "bg-muted text-primary border border-border/60"
              }`}
            >
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-3 my-2 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

