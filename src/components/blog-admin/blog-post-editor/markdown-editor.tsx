import { Eye, Code, FileText } from 'lucide-react';
import { marked } from 'marked';
import * as React from 'react';
import sanitizeHtml from 'sanitize-html';

import { logger } from '../../../lib/logger';

import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your post content in markdown...',
  disabled = false,
  minHeight = '400px',
}) => {
  const [activeTab, setActiveTab] = React.useState<'write' | 'preview'>('write');

  const renderMarkdown = (markdown: string): string => {
    try {
      const rawHtml = marked.parse(markdown, { async: false }) as string;

      const cleanHtml = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'img',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'pre',
          'code',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          img: ['src', 'alt', 'title', 'width', 'height'],
          a: ['href', 'name', 'target', 'rel'],
          code: ['class'],
          pre: ['class'],
        },
        allowedSchemes: ['http', 'https', 'mailto'],
      });

      return cleanHtml;
    } catch (error) {
      logger.error('Markdown parsing error:', error);
      return '<p>Error rendering markdown preview</p>';
    }
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText =
      value.substring(0, start) + before + selectedText + after + value.substring(end);

    onChange(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length,
      );
    }, 0);
  };

  const markdownHelpers = [
    { label: 'H2', action: () => insertMarkdown('## ', '\n') },
    { label: 'H3', action: () => insertMarkdown('### ', '\n') },
    { label: 'Bold', action: () => insertMarkdown('**', '**') },
    { label: 'Italic', action: () => insertMarkdown('*', '*') },
    { label: 'Code', action: () => insertMarkdown('`', '`') },
    { label: 'Link', action: () => insertMarkdown('[', '](url)') },
    { label: 'Image', action: () => insertMarkdown('![alt text](', ')') },
    { label: 'List', action: () => insertMarkdown('- ', '\n') },
    { label: 'Quote', action: () => insertMarkdown('> ', '\n') },
    { label: 'Code Block', action: () => insertMarkdown('```\n', '\n```') },
  ];

  return (
    <div className="space-y-2">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'write' | 'preview')}>
        <div className="flex items-center justify-between mb-2">
          <TabsList>
            <TabsTrigger value="write" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="write" className="space-y-2 mt-0">
          <div className="flex flex-wrap gap-1 mb-2">
            {markdownHelpers.map((helper) => (
              <button
                key={helper.label}
                type="button"
                onClick={helper.action}
                disabled={disabled}
                className="px-2 py-1 text-xs border rounded hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {helper.label}
              </button>
            ))}
          </div>
          <Textarea
            name="content"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="font-mono text-sm"
            style={{ minHeight }}
            rows={20}
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="w-3 h-3" />
            <span>{value.length} characters</span>
            <span>•</span>
            <span>{value.split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card className="p-6" style={{ minHeight }}>
            {value.trim() === '' ? (
              <p className="text-muted-foreground italic">Nothing to preview yet...</p>
            ) : (
              <div
                className="prose prose-slate dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
              />
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
