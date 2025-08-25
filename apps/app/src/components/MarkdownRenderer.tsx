import React, { useMemo } from 'react';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const htmlContent = useMemo(() => {
    try {
      const result = remark()
        .use(remarkParse)
        .use(remarkGfm) // Adds autolink support and other GitHub Flavored Markdown features
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeStringify)
        .processSync(content);
      
      return String(result);
    } catch {
      // Failed to render markdown - fallback to plain text
      return content;
    }
  }, [content]);

  return (
    <div 
      className={`markdown-content markdown-selectable ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}