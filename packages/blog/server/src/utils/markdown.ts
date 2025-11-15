import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import yaml from 'highlight.js/lib/languages/yaml';
import { marked } from 'marked';
import sanitizeHtml, { type Attributes } from 'sanitize-html';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('css', css);

const renderer = new marked.Renderer();

// Adapt to marked's current Code renderer signature
renderer.code = function renderCode({ text, lang }: any) {
  const code: string = typeof text === 'string' ? text : '';
  const rawLanguage = typeof lang === 'string' ? lang.trim().split(/\s+/)[0] : '';
  const normalizedLanguage = normalizeLanguage(rawLanguage);

  let highlighted = code;
  let detectedLanguage = normalizedLanguage;

  try {
    if (normalizedLanguage && hljs.getLanguage(normalizedLanguage)) {
      highlighted = hljs.highlight(code, { language: normalizedLanguage, ignoreIllegals: true }).value;
    } else {
      const result = hljs.highlightAuto(code);
      highlighted = result.value;
      detectedLanguage = result.language ? normalizeLanguage(result.language) : 'plaintext';
    }
  } catch (error) {
    console.warn('Failed to highlight code block', error);
    highlighted = escapeHtml(code);
    detectedLanguage = 'plaintext';
  }

  const languageLabel = detectedLanguage || 'plaintext';
  const caption = rawLanguage ? `<figcaption class="ir-code-label">${escapeHtml(rawLanguage)}</figcaption>` : '';

  return `<figure class="ir-code-block" data-language="${languageLabel}">
    ${caption}
    <pre class="ir-code-block__surface" tabindex="0" role="region" aria-label="Code block in ${languageLabel}">
      <code class="hljs ir-code-block__code language-${languageLabel}">${highlighted}</code>
    </pre>
  </figure>`;
};

function normalizeLanguage(lang: string): string {
  if (!lang) return '';
  const normalized = lang.toLowerCase().trim();
  const aliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
  };
  return aliases[normalized] || normalized;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
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
  'span',
]));

const COMMON_ATTRIBUTES = [
  'class',
  'id',
  'title',
  'aria-label',
  'aria-hidden',
  'role',
  'data-language',
  'tabindex',
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
