import { marked } from 'marked';
import sanitizeHtml, { type Attributes } from 'sanitize-html';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const ALLOWED_TAGS = Array.from(new Set([
  ...sanitizeHtml.defaults.allowedTags,
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'img',
  'figure',
  'figcaption',
  'pre',
  'code',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'sup',
  'sub',
  'small',
]));

const COMMON_ATTRIBUTES = [
  'class',
  'id',
  'title',
  'aria-label',
  'aria-hidden',
  'role',
  'data-language',
];

const allowedAttributes: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': COMMON_ATTRIBUTES,
  a: [...COMMON_ATTRIBUTES, 'href', 'name', 'target', 'rel'],
  img: [...COMMON_ATTRIBUTES, 'src', 'srcset', 'sizes', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
  code: [...COMMON_ATTRIBUTES, 'data-language'],
  pre: COMMON_ATTRIBUTES,
  td: COMMON_ATTRIBUTES,
  th: COMMON_ATTRIBUTES,
  span: COMMON_ATTRIBUTES,
};

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes,
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (_tagName: string, attribs: Attributes) => {
      const next = { ...attribs };
      if (next.target === '_blank') {
        const rel = new Set((next.rel ?? '').split(/\s+/).filter(Boolean));
        rel.add('noopener');
        rel.add('noreferrer');
        next.rel = Array.from(rel).join(' ');
      }
      return { tagName: 'a', attribs: next };
    },
  },
};

export interface RenderedMarkdown {
  html: string;
  text: string;
}

export function renderMarkdown(markdown: string | null | undefined): RenderedMarkdown {
  const source = typeof markdown === 'string' ? markdown : '';
  const rawHtml = marked.parse(source, { async: false }) as string;
  const sanitizedHtml = sanitizeHtml(rawHtml, sanitizeOptions);
  const text = extractPlainText(sanitizedHtml);
  return { html: sanitizedHtml, text };
}

export function extractPlainText(html: string): string {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return text.replace(/\s+/g, ' ').trim();
}

export function createExcerpt(text: string, maxLength = 160): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace === -1) return `${truncated}…`;
  return `${truncated.slice(0, lastSpace)}…`;
}
