import { BlogDocument, type BaseMeta } from './document.js';
import { createArticleSchema, createSoftwareApplicationSchema } from './seo.js';

import type { SiteConfig } from '../../config/site.js';
import type { ResolvedAssets } from '../../lib/manifest.js';
import type { BlogPost } from '../../services/blog-service.js';

interface BlogPostPageProps {
  site: SiteConfig;
  assets: ResolvedAssets | null;
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export function BlogPostPage({ site, assets, post, relatedPosts }: BlogPostPageProps) {
  const canonicalUrl = `${site.url}/blog/${post.slug}`;
  const allKeywords = [...(post.categories as any[]), ...(post.tags as any[])].map(String).filter(Boolean);
  const meta: BaseMeta = {
    title: `${post.title} | ${site.name}`,
    description: post.excerpt,
    canonicalUrl,
    imageUrl: (post as any).coverImageUrl ?? site.defaultSocialImageUrl,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt ?? post.publishedAt,
    tags: post.tags,
    keywords: allKeywords,
    section: post.categories[0] ?? null,
    authorName: post.authorName ?? null,
  };

  const structuredData = [
    createArticleSchema(site, canonicalUrl, post),
    createSoftwareApplicationSchema(site),
  ];

  const preloadState = {
    page: 'post' as const,
    generatedAt: new Date().toISOString(),
    post: mapPostForClient(post),
    relatedPosts: relatedPosts.slice(0, 4).map(mapPostForClient),
  };

  return (
    <BlogDocument site={site} assets={assets} meta={meta} structuredData={structuredData} preloadState={preloadState}>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950">
        <header className="relative border-b border-amber-900/30">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-transparent" />
          {post.coverImageUrl ? (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{ backgroundImage: `url(${post.coverImageUrl})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />
            </>
          ) : null}
          <div className="relative mx-auto max-w-4xl px-6 py-16 md:px-10 md:py-24 lg:px-16">
            <div className="flex flex-col gap-6">
              <a
                href="/blog"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 backdrop-blur-sm transition-colors hover:border-amber-500/60 hover:text-amber-300"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Chronicles</span>
              </a>

              {allKeywords.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2" role="list">
                  {post.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center rounded-full border border-amber-600/40 bg-amber-950/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-200 backdrop-blur-sm"
                      role="listitem"
                    >
                      {category}
                    </span>
                  ))}
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm"
                      role="listitem"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <h1 className="font-heading text-4xl font-bold leading-tight tracking-tight text-amber-50 sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                {(post as any).authorName ? (
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>{(post as any).authorName}</span>
                  </div>
                ) : null}
                <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
                <time dateTime={post.publishedAt} className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(post.publishedAt)}
                </time>
                <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {post.readingTimeMinutes} min read
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
                <span className="text-slate-400">{post.estimatedWordCount} words</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </header>

        <main className="mx-auto max-w-4xl px-6 py-16 md:px-10 lg:px-16">
          <article>
            <div
              className="ir-prose prose prose-lg prose-invert prose-slate max-w-none leading-relaxed prose-headings:font-heading prose-headings:tracking-tight prose-headings:text-amber-50 prose-p:text-slate-300 prose-a:text-amber-400 prose-a:no-underline hover:prose-a:text-amber-300 hover:prose-a:underline prose-strong:text-slate-200 prose-code:rounded prose-code:bg-slate-900/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-amber-300 prose-code:before:content-none prose-code:after:content-none prose-pre:border prose-pre:border-slate-800/80 prose-pre:bg-slate-950/80 prose-img:rounded-lg prose-img:border prose-img:border-slate-800"
              dangerouslySetInnerHTML={{ __html: post.html }}
            />
          </article>

          {((post.tags as any[]).length > 0 || (post.categories as any[]).length > 0) ? (
            <footer className="mt-12 border-t border-slate-800/60 pt-8">
              <div className="flex flex-col gap-4">
                {(post.categories as any[]).length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-300">Categories</h2>
                    <div className="flex flex-wrap gap-2">
                      {(post.categories as any[]).map((category: any) => (
                        <span
                          key={category}
                          className="inline-flex items-center rounded-full border border-amber-600/40 bg-amber-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-200"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {(post.tags as any[]).length > 0 ? (
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-300">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                      {(post.tags as any[]).map((tag: any) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md border border-slate-700/60 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </footer>
          ) : null}

          {relatedPosts.length > 0 ? (
            <aside className="mt-16 border-t border-slate-800/60 pt-12">
              <h2 className="mb-8 font-heading text-2xl font-bold text-amber-50">Continue Your Quest</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
                {relatedPosts.slice(0, 4).map((other: any) => (
                  <article
                    key={other.id}
                    className="group flex flex-col gap-4 overflow-hidden rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 to-slate-900/60 p-5 transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-900/20"
                  >
                    {other.coverImageUrl ? (
                      <div className="relative aspect-video overflow-hidden rounded-lg">
                        <img
                          src={other.coverImageUrl}
                          alt={other.coverImageAlt || ''}
                          loading="lazy"
                          decoding="async"
                          width="400"
                          height="225"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-amber-300">
                        <time dateTime={other.publishedAt}>
                          {formatDate(other.publishedAt)}
                        </time>
                        <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
                        <span className="text-slate-400">{other.readingTimeMinutes} min read</span>
                      </div>
                      <h3 className="font-heading text-lg font-bold leading-snug text-slate-100 transition-colors group-hover:text-amber-300">
                        <a href={`/blog/${other.slug}`} className="after:absolute after:inset-0">
                          {other.title}
                        </a>
                      </h3>
                      <p className="text-sm leading-relaxed text-slate-300 line-clamp-2">{other.excerpt}</p>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          ) : null}

          <div className="mt-12 border-t border-slate-800/60 pt-8 text-center">
            <a
              href="/blog"
              className="inline-flex items-center gap-2 rounded-full border border-amber-700/40 bg-amber-900/30 px-6 py-3 text-sm font-semibold text-amber-200 transition-colors hover:border-amber-500/60 hover:text-amber-100"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>View All Chronicles</span>
            </a>
          </div>
        </main>

        <footer className="border-t border-slate-800/60 py-12">
          <div className="mx-auto max-w-4xl px-6 text-center md:px-10 lg:px-16">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} {site.name}. Embark on your adventure.
            </p>
          </div>
        </footer>
      </div>
    </BlogDocument>
  );
}

function mapPostForClient(post: BlogPost) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt ?? null,
    coverImageUrl: post.coverImageUrl ?? null,
    coverImageAlt: post.coverImageAlt ?? null,
    authorName: post.authorName ?? null,
    tags: post.tags,
    categories: post.categories,
    readingTimeMinutes: post.readingTimeMinutes,
  };
}

function formatDate(value: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
