"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyH4,
  TypographyP,
  TypographyBlockquote,
  TypographyList,
  TypographyInlineCode,
} from "@/components/ui/typography";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ className, ...props }) => (
            <TypographyH1
              className={cn("mt-2 mb-4 text-2xl", className)}
              {...props}
            />
          ),
          h2: ({ className, ...props }) => (
            <TypographyH2
              className={cn("mt-2 mb-3 text-xl", className)}
              {...props}
            />
          ),
          h3: ({ className, ...props }) => (
            <TypographyH3
              className={cn("mt-2 mb-2 text-lg", className)}
              {...props}
            />
          ),
          h4: ({ className, ...props }) => (
            <TypographyH4
              className={cn("mt-2 mb-2 text-base", className)}
              {...props}
            />
          ),
          p: ({ className, ...props }) => (
            <TypographyP
              className={cn("mb-2 last:mb-0", className)}
              {...props}
            />
          ),
          blockquote: ({ className, ...props }) => (
            <TypographyBlockquote
              className={cn("my-3", className)}
              {...props}
            />
          ),
          ul: ({ className, ...props }) => (
            <TypographyList className={cn("my-2", className)} {...props} />
          ),
          code: ({ className, ...props }) => (
            <TypographyInlineCode className={className} {...props} />
          ),
          pre: ({ className, ...props }) => (
            <pre
              className={cn(
                "my-3 rounded-lg bg-muted p-4 overflow-x-auto",
                className
              )}
              {...props}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
