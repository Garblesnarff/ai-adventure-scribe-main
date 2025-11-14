import { Calendar, Clock, User, Home } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlogPosts } from '@/hooks/blog/useBlogPosts';

const BlogIndex: React.FC = () => {
  const { data: posts, isLoading, error } = useBlogPosts();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <Skeleton className="mb-4 h-12 w-96 mx-auto" />
            <Skeleton className="mb-6 h-6 w-80 mx-auto" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
                <Skeleton className="mb-4 h-4 w-20" />
                <Skeleton className="mb-3 h-6 w-3/4" />
                <Skeleton className="mb-4 h-16 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h1 className="mb-2 text-xl font-semibold text-destructive">Error Loading Blog</h1>
            <p className="text-sm text-muted-foreground">
              There was a problem loading the blog posts. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-amber-900/30 bg-gradient-to-r from-slate-900 via-indigo-900/40 to-slate-900 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-600/40 bg-amber-950/40 px-5 py-2 text-sm font-semibold text-amber-200 shadow-lg shadow-amber-900/20">
            <span>📜</span>
            <span>Infinite Realms Chronicles</span>
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-amber-50 lg:text-6xl">
            Tales from the{' '}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              Infinite Realms
            </span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-300">
            Dive into updates, guides, and stories from your AI-powered fantasy RPG adventures.
            Discover new features, learn advanced techniques, and explore the ever-expanding
            multiverse.
          </p>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-slate-400">
            <li>
              <Link to="/app" className="hover:text-amber-400 transition-colors">
                <Home className="h-4 w-4" />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            <li>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </li>
            <li>
              <span className="text-slate-300">Blog</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Main content */}
      <main className="container mx-auto px-4 py-16">
        {!posts || posts.length === 0 ? (
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-950/40 text-4xl text-amber-400">
              ⚔️
            </div>
            <h2 className="mt-6 text-2xl font-bold text-slate-100">The Quest Begins Soon</h2>
            <p className="mt-2 text-slate-400">
              Our scribes are preparing the next chapter. Check back soon for the latest tales from
              the Infinite Realms.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 shadow-xl backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-900/20"
                >
                  {post.coverImageUrl && (
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={post.coverImageUrl}
                        alt={post.heroImageAlt || ''}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80" />
                      {post.categories && post.categories.length > 0 && (
                        <span className="absolute right-4 top-4 rounded-full border border-amber-600/40 bg-amber-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200 backdrop-blur-sm">
                          {post.categories[0].name ||
                            post.categories[0].title ||
                            post.categories[0].slug}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-1 flex-col gap-4 p-6">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-amber-300">
                      <time dateTime={post.publishedAt || post.createdAt}>
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </time>
                    </div>

                    <h2 className="font-heading text-xl font-bold leading-snug text-slate-100 transition-colors group-hover:text-amber-300">
                      <Link to={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                        {post.title}
                      </Link>
                    </h2>

                    {post.excerpt && (
                      <p className="text-sm leading-relaxed text-slate-300">{post.excerpt}</p>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-800 pt-4">
                        {post.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="border-slate-700/60 text-slate-400"
                          >
                            #{tag.name}
                          </Badge>
                        ))}
                        {post.tags.length > 3 && (
                          <Badge variant="outline" className="border-slate-700/60 text-slate-400">
                            +{post.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            {/* Load more / pagination would go here */}
            <div className="mt-12 text-center">
              <Button variant="outline" size="lg">
                Load More Posts
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Infinite Realms. Embark on your adventure.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BlogIndex;
