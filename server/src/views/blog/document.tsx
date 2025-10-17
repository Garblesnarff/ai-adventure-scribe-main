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

  return (
    <html lang="en" className="min-h-full bg-slate-950 text-slate-100">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={meta.canonicalUrl} />

        <meta property="og:site_name" content={site.name} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:type" content={meta.type ?? 'website'} />
        <meta property="og:url" content={meta.canonicalUrl} />
        <meta property="og:image" content={ogImage} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:site" content={site.twitterHandle} />
        {meta.authorName ? <meta name="author" content={meta.authorName} /> : null}
        {meta.publishedTime ? <meta property="article:published_time" content={meta.publishedTime} /> : null}
        {meta.modifiedTime ? <meta property="article:modified_time" content={meta.modifiedTime} /> : null}
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
