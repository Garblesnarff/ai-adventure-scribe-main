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
  const heroImage = posts.find((post) => Boolean((post as any).coverImageUrl))?.coverImageUrl ?? site.defaultSocialImageUrl;

  const allCategories = extractCategories(posts);
  const allTags = extractTags(posts);
  const meta: BaseMeta = {
    title: `${site.name} Blog - Chronicles from the Infinite Realms`,
    description: 'Updates, guides, and stories from the world of Infinite Realms AI-powered fantasy RPG adventures.',
    canonicalUrl,
    imageUrl: heroImage,
    type: 'website',
    keywords: [...allCategories, ...allTags].slice(0, 20),
    section: allCategories[0] ?? null,
  };

  const structuredData = [
    createBlogSchema(site, canonicalUrl, posts),
    createSoftwareApplicationSchema(site),
  ];

  const preloadState = {
    page: 'index' as const,
    generatedAt: new Date().toISOString(),
    posts: posts.map(mapPostForClient),
    categories: allCategories,
    tags: allTags,
  };

  return (
    <BlogDocument site={site} assets={assets} meta={meta} structuredData={structuredData} preloadState={preloadState}>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950">
        <header className="relative overflow-hidden border-b border-amber-900/30 bg-gradient-to-r from-slate-900 via-indigo-900/40 to-slate-900">
          <div className="absolute inset-0 bg-[url('/branding/parchment-texture.png')] opacity-5" />
          <div className="relative mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-16 lg:py-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-600/40 bg-amber-950/40 px-5 py-2 text-sm font-semibold text-amber-200 shadow-lg shadow-amber-900/20">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
                <span>Infinite Realms Chronicles</span>
              </div>
              <h1 className="mb-6 font-heading text-5xl font-bold leading-tight tracking-tight text-amber-50 lg:text-6xl">
                Tales from the <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">Infinite Realms</span>
              </h1>
              <p className="text-lg leading-relaxed text-slate-300">
                Dive into updates, guides, and stories from your AI-powered fantasy RPG adventures. Discover new features, learn advanced techniques, and explore the ever-expanding multiverse.
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </header>

        <main className="mx-auto max-w-7xl px-6 py-16 md:px-10 lg:px-16">
          <div className="mb-12">
            <div id="blog-filters" className="flex flex-col gap-6 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <label htmlFor="blog-search" className="sr-only">Search posts</label>
                <div className="relative">
                  <input
                    id="blog-search"
                    type="search"
                    placeholder="Search posts by title, tag, or category..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-4 py-3 pl-12 text-slate-200 placeholder-slate-500 transition-colors focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    data-blog-search
                  />
                  <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {allCategories.length > 0 ? (
                  <div>
                    <label htmlFor="category-filter" className="sr-only">Filter by category</label>
                    <select
                      id="category-filter"
                      className="rounded-lg border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-200 transition-colors focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      data-category-filter
                    >
                      <option value="">All Categories</option>
                      {allCategories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <button
                  type="button"
                  className="rounded-lg border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm font-medium text-slate-300 transition-colors hover:border-amber-500/60 hover:text-amber-300"
                  data-clear-filters
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div id="blog-posts" className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3" data-blog-posts>
            {posts.length ? (
              posts.map((post) => (
                <article
                  key={post.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-900/20"
                  data-post-slug={post.slug}
                  data-post-tags={post.tags.join(',')}
                  data-post-categories={post.categories.join(',')}
                >
                  {(post as any).coverImageUrl ? (
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={(post as any).coverImageUrl}
                        alt={(post as any).coverImageAlt || ''}
                        loading="lazy"
                        decoding="async"
                        width="600"
                        height="338"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80" />
                      {post.categories.length > 0 ? (
                        <span className="absolute right-4 top-4 rounded-full border border-amber-600/40 bg-amber-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200 backdrop-blur-sm">
                          {post.categories[0]}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col gap-4 p-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-amber-300">
                      <time dateTime={post.publishedAt}>
                        {formatDate(post.publishedAt)}
                      </time>
                      <span className="h-1 w-1 rounded-full bg-slate-600" aria-hidden="true" />
                      <span className="text-slate-400">{post.readingTimeMinutes} min read</span>
                    </div>
                    <h2 className="font-heading text-xl font-bold leading-snug text-slate-100 transition-colors group-hover:text-amber-300">
                      <a href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                        {post.title}
                      </a>
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-300">
                      {post.excerpt}
                    </p>
                    {post.tags.length > 0 ? (
                      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-md border border-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                        {post.tags.length > 3 ? (
                          <span className="inline-flex items-center rounded-md border border-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-400">
                            +{post.tags.length - 3}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="col-span-full">
                <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-10 py-20 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-950/40 text-4xl text-amber-400">
                    ⚔️
                  </div>
                  <div className="flex flex-col gap-2">
                    <h2 className="font-heading text-2xl font-bold text-slate-100">The Quest Begins Soon</h2>
                    <p className="text-slate-400">
                      Our scribes are preparing the next chapter. Check back soon for the latest tales from the Infinite Realms.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4" data-pagination-container>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-amber-700/40 bg-amber-900/30 px-6 py-3 text-sm font-semibold text-amber-200 transition-colors hover:border-amber-500/60 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
              data-load-more
            >
              <span>Show more stories</span>
              <span aria-hidden="true">→</span>
            </button>
            <div className="text-xs text-slate-500" data-pagination-status aria-live="polite" />
          </div>

          <div id="no-results" className="hidden pt-12" data-no-results>
            <div className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/40 px-10 py-20 text-center">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/80 text-4xl">
                🔍
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="font-heading text-2xl font-bold text-slate-100">No Posts Found</h2>
                <p className="text-slate-400">
                  Try adjusting your filters or search terms to find what you're looking for.
                </p>
              </div>
            </div>
          </div>

          <div aria-hidden="true" data-infinite-scroll-sentinel className="h-1 w-full" />
        </main>

        <footer className="border-t border-slate-800/60 py-12">
          <div className="mx-auto max-w-7xl px-6 text-center md:px-10 lg:px-16">
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

function extractCategories(posts: BlogPost[]): string[] {
  const categories = new Set<string>();
  posts.forEach((post) => {
    post.categories.forEach((category) => categories.add(category));
  });
  return Array.from(categories).sort();
}

function extractTags(posts: BlogPost[]): string[] {
  const tags = new Set<string>();
  posts.forEach((post) => {
    post.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort();
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
