import type { BlogPost } from '../../services/blog-service.js';
import type { SiteConfig } from '../../config/site.js';
import type { ResolvedAssets } from '../../lib/manifest.js';
import { BlogDocument, type BaseMeta } from './document.js';
import { createBlogSchema, createSoftwareApplicationSchema } from './seo.js';

interface BlogIndexPageProps {
  site: SiteConfig;
  assets: ResolvedAssets | null;
  posts: BlogPost[];
}

export function BlogIndexPage({ site, assets, posts }: BlogIndexPageProps) {
  const canonicalUrl = `${site.url}/blog`;
  const heroImage = posts.find((post) => Boolean(post.coverImageUrl))?.coverImageUrl ?? site.defaultSocialImageUrl;

  const meta: BaseMeta = {
    title: `${site.name} Blog`,
    description: site.description,
    canonicalUrl,
    imageUrl: heroImage,
    type: 'website',
  };

  const structuredData = [
    createBlogSchema(site, canonicalUrl, posts),
    createSoftwareApplicationSchema(site),
  ];

  const preloadState = {
    page: 'index' as const,
    generatedAt: new Date().toISOString(),
    posts: posts.map(mapPostForClient),
  };

  return (
    <BlogDocument site={site} assets={assets} meta={meta} structuredData={structuredData} preloadState={preloadState}>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16 md:px-10 lg:px-16">
        <header className="flex flex-col gap-6 text-center md:gap-8">
          <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1 text-sm font-medium text-slate-200 shadow-sm">
            <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
            Infinite Realms Updates
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Chronicles from the Infinite Realms
          </h1>
          <p className="mx-auto max-w-2xl text-base text-slate-300 sm:text-lg">
            {site.description}
          </p>
        </header>

        <section className="grid grid-cols-1 gap-10 md:grid-cols-2">
          {posts.length ? (
            posts.map((post) => (
              <article
                key={post.id}
                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl transition-all hover:border-emerald-500/60 hover:shadow-emerald-500/20"
              >
                {post.coverImageUrl ? (
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <img
                      src={post.coverImageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-950/20 to-transparent" />
                  </div>
                ) : null}
                <div className="flex flex-1 flex-col gap-5 p-8">
                  <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-wide text-emerald-400">
                    <time dateTime={post.publishedAt} className="text-slate-300">
                      {formatDate(post.publishedAt)}
                    </time>
                    <span className="h-1 w-1 rounded-full bg-slate-700" aria-hidden="true" />
                    <span className="text-slate-300">{post.readingTimeMinutes} min read</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-white transition-colors group-hover:text-emerald-300">
                    <a href={`/blog/${post.slug}`}>{post.title}</a>
                  </h2>
                  <p className="text-sm text-slate-300">
                    {post.excerpt}
                  </p>
                  {post.tags.length ? (
                    <div className="mt-auto flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-full border border-slate-700 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-300"
                        >
                          {`#${tag}`}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-emerald-500/10 px-5 py-2 text-sm font-semibold text-emerald-300">
                    Continue reading
                    <span aria-hidden="true">→</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 px-10 py-16 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-slate-800/80 text-2xl text-emerald-300">
                ✨
              </span>
              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-semibold text-white">Stories are brewing</h2>
                <p className="text-sm text-slate-300">
                  Our team is preparing the next chapter. Check back soon for the latest updates from the Infinite Realms.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
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
