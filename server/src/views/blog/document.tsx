import type { ReactNode } from 'react';
import type { ResolvedAssets } from '../../lib/manifest.js';
import type { SiteConfig } from '../../config/site.js';

export interface BaseMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl?: string | null;
  type?: 'website' | 'article';
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
  keywords?: string[];
  section?: string | null;
  authorName?: string | null;
}

interface BlogDocumentProps {
  site: SiteConfig;
  assets: ResolvedAssets | null;
  meta: BaseMeta;
  children: ReactNode;
  preloadState?: unknown;
  structuredData?: unknown[];
}

export function BlogDocument({ site, assets, meta, children, preloadState, structuredData }: BlogDocumentProps) {
  const scripts = assets?.scripts ?? [];
  const styles = assets?.styles ?? [];
  const preloads = assets?.preloads ?? [];
  const additionalAssets = assets?.assets ?? [];
  const serializedState = preloadState ? serializeJson(preloadState) : null;
  const structuredJson = structuredData?.length ? structuredData.map(serializeJson) : [];
  const ogImage = meta.imageUrl || site.defaultSocialImageUrl;
  const tagMeta = meta.tags ?? [];
  const keywordMeta = meta.keywords ?? [];
  const allKeywords = Array.from(new Set([...keywordMeta, ...tagMeta]));

  return (
    <html lang="en" className="min-h-full bg-slate-950 text-slate-100">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0f172a" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        {allKeywords.length > 0 ? <meta name="keywords" content={allKeywords.join(', ')} /> : null}
        <link rel="canonical" href={meta.canonicalUrl} />

        <meta property="og:site_name" content={site.name} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:type" content={meta.type ?? 'website'} />
        <meta property="og:url" content={meta.canonicalUrl} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:alt" content={meta.title} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:image:alt" content={meta.title} />
        <meta name="twitter:site" content={site.twitterHandle} />
        {meta.authorName ? <meta name="author" content={meta.authorName} /> : null}
        {meta.authorName ? <meta property="article:author" content={meta.authorName} /> : null}
        {meta.publishedTime ? <meta property="article:published_time" content={meta.publishedTime} /> : null}
        {meta.modifiedTime ? <meta property="article:modified_time" content={meta.modifiedTime} /> : null}
        {meta.section ? <meta property="article:section" content={meta.section} /> : null}
        {tagMeta.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {preloads.map((href) => (
          <link key={href} rel="modulepreload" href={href} crossOrigin="anonymous" />
        ))}
        {styles.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {additionalAssets.map((href) => (
          <link key={href} rel="preload" as="image" href={href} />
        ))}

        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap"
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Highlight.js Dark Theme for Code Blocks */
              .hljs {
                background: rgb(15 23 42 / 0.8);
                color: #cbd5e1;
                display: block;
                overflow-x: auto;
                padding: 1rem;
              }
              .hljs-comment, .hljs-quote { color: #64748b; font-style: italic; }
              .hljs-keyword, .hljs-selector-tag, .hljs-subst { color: #f59e0b; font-weight: 600; }
              .hljs-number, .hljs-literal, .hljs-variable, .hljs-template-variable { color: #fbbf24; }
              .hljs-string, .hljs-doctag { color: #34d399; }
              .hljs-title, .hljs-section, .hljs-selector-id { color: #60a5fa; font-weight: 600; }
              .hljs-type, .hljs-class, .hljs-tag { color: #a78bfa; }
              .hljs-symbol, .hljs-bullet, .hljs-attribute { color: #fb923c; }
              .hljs-built_in, .hljs-builtin-name { color: #38bdf8; }
              .hljs-meta, .hljs-deletion { color: #e11d48; }
              .hljs-addition { color: #22c55e; }
              .hljs-emphasis { font-style: italic; }
              .hljs-strong { font-weight: 700; }

              /* Blog Code Block Container */
              .ir-code-block {
                margin: 1.5rem 0;
                border-radius: 0.75rem;
                overflow: hidden;
                border: 1px solid rgb(30 41 59 / 0.8);
                background: linear-gradient(135deg, rgb(15 23 42 / 0.6), rgb(30 41 59 / 0.4));
                backdrop-filter: blur(4px);
              }
              .ir-code-label {
                display: block;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #fbbf24;
                padding: 0.5rem 1rem;
                background: rgb(20 25 36 / 0.8);
                border-bottom: 1px solid rgb(30 41 59 / 0.6);
              }
              .ir-code-block__surface {
                margin: 0;
                border-radius: 0;
                background: transparent;
                font-size: 0.875rem;
                line-height: 1.6;
              }
              .ir-code-block__code {
                display: block;
                padding: 1.25rem;
                background: transparent;
              }
              .ir-code-block__surface:focus {
                outline: 2px solid #f59e0b;
                outline-offset: -2px;
              }

              /* Blog Prose Enhancements */
              .ir-prose {
                font-size: 1.125rem;
                line-height: 1.75;
              }
              .ir-prose img {
                margin: 2rem auto;
              }
              .ir-prose blockquote {
                border-left: 4px solid #f59e0b;
                padding-left: 1.5rem;
                font-style: italic;
                color: #cbd5e1;
                background: rgb(30 41 59 / 0.3);
                padding: 1rem 1.5rem;
                border-radius: 0.5rem;
                margin: 1.5rem 0;
              }
              .ir-prose table {
                width: 100%;
                border-collapse: collapse;
                margin: 1.5rem 0;
                font-size: 0.875rem;
              }
              .ir-prose th {
                background: rgb(30 41 59 / 0.6);
                padding: 0.75rem;
                text-align: left;
                font-weight: 600;
                color: #fbbf24;
                border: 1px solid rgb(51 65 85);
              }
              .ir-prose td {
                padding: 0.75rem;
                border: 1px solid rgb(51 65 85);
              }
              .ir-prose tr:hover {
                background: rgb(30 41 59 / 0.3);
              }
            `,
          }}
        />

        {structuredJson.map((json, index) => (
          <script
            key={`jsonld-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: json }}
          />
        ))}
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <div id="blog-root" className="min-h-screen">
          {children}
        </div>
        {serializedState ? (
          <script
            id="__BLOG_DATA__"
            type="application/json"
            dangerouslySetInnerHTML={{ __html: serializedState }}
          />
        ) : null}
        {serializedState ? (
          <script
            id="__BLOG_DATA_BOOTSTRAP__"
            dangerouslySetInnerHTML={{ __html: `window.__BLOG_DATA__=${serializedState};` }}
          />
        ) : null}
        {scripts.map((src) => (
          <script key={src} type="module" src={src} defer crossOrigin="anonymous" />
        ))}
      </body>
    </html>
  );
}

function serializeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
