import type { BlogPost } from '../../services/blog-service.js';
import type { SiteConfig } from '../../config/site.js';
import type { ResolvedAssets } from '../../lib/manifest.js';
import { BlogDocument, type BaseMeta } from './document.js';
import { createArticleSchema, createSoftwareApplicationSchema } from './seo.js';

interface BlogPostPageProps {
  site: SiteConfig;
  assets: ResolvedAssets | null;
  post: BlogPost;
  relatedPosts: BlogPost[];
}

export function BlogPostPage({ site, assets, post, relatedPosts }: BlogPostPageProps) {
  const canonicalUrl = `${site.url}/blog/${post.slug}`;
  const meta: BaseMeta = {
    title: `${post.title} | ${site.name}`,
    description: post.excerpt,
    canonicalUrl,
    imageUrl: post.coverImageUrl ?? site.defaultSocialImageUrl,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt ?? post.publishedAt,
    tags: post.tags,
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
      <article className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-6 py-16 md:px-10 lg:px-16">
        <header className="flex flex-col gap-6 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium uppercase tracking-wide text-emerald-400">
            <time dateTime={post.publishedAt} className="text-slate-300">
              {formatDate(post.publishedAt)}
            </time>
            <span className="h-1 w-1 rounded-full bg-slate-700" aria-hidden="true" />
            <span className="text-slate-300">{post.readingTimeMinutes} min read</span>
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
            {post.title}
          </h1>
          {post.authorName ? (
            <p className="text-sm text-slate-300">By {post.authorName}</p>
          ) : null}
          {post.coverImageUrl ? (
            <div className="relative overflow-hidden rounded-3xl border border-slate-800">
              <img
                src={post.coverImageUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </header>

        <div
          className="prose prose-invert prose-emerald max-w-none text-base leading-relaxed"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {post.tags.length ? (
          <footer className="border-t border-slate-800 pt-8">
            <div className="flex flex-wrap items-center gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300"
                >
                  {`#${tag}`}
                </span>
              ))}
            </div>
          </footer>
        ) : null}

        {relatedPosts.length ? (
          <aside className="border-t border-slate-800 pt-10">
            <h2 className="text-lg font-semibold text-white">Continue exploring</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {relatedPosts.slice(0, 4).map((other) => (
                <a
                  key={other.id}
                  href={`/blog/${other.slug}`}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-all hover:border-emerald-500/60 hover:text-emerald-300"
                >
                  <span className="text-xs font-medium uppercase tracking-wide text-emerald-300">
                    {formatDate(other.publishedAt)} · {other.readingTimeMinutes} min read
                  </span>
                  <span className="text-base font-semibold text-white">{other.title}</span>
                  <span className="text-sm text-slate-300 line-clamp-3">{other.excerpt}</span>
                </a>
              ))}
            </div>
          </aside>
        ) : null}

        <div className="border-t border-slate-800 pt-10 text-center">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-5 py-2 text-sm font-semibold text-slate-200 transition-all hover:border-emerald-500/60 hover:text-emerald-300"
          >
            ← Back to all posts
          </a>
        </div>
      </article>
    </BlogDocument>
  );
}

function mapPostForClient(post: BlogPost) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    markdown: post.markdown,
    html: post.html,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt ?? null,
    coverImageUrl: post.coverImageUrl ?? null,
    authorName: post.authorName ?? null,
    tags: post.tags,
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
