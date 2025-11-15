import { ArrowLeft, Calendar, Clock, User, Tag, Home } from 'lucide-react';
import React from 'react';
import { useParams, Link } from 'react-router-dom';

import type { BlogPost } from '@/types/blog';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBlogPostBySlug } from '@/hooks/blog/useBlogPosts';


const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, error } = useBlogPostBySlug(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="mb-6 h-8 w-48" />
          <Skeleton className="mb-4 h-12 w-3/4" />
          <Skeleton className="mb-6 h-6 w-1/2" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h1 className="mb-2 text-xl font-semibold text-destructive">Post not found</h1>
            <p className="text-sm text-muted-foreground">
              The blog post you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild className="mt-4">
              <Link to="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <article className="container mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
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
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <Link to="/blog" className="hover:text-amber-400 transition-colors">
                Blog
              </Link>
            </li>
            <li>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </li>
            <li>
              <span className="text-slate-300 truncate max-w-xs" title={post.title}>
                {post.title}
              </span>
            </li>
          </ol>
        </nav>

        {/* Article header */}
        <header className="mb-8">
          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {post.categories.map((category) => (
                <Badge key={category.id} variant="secondary" className="bg-amber-950/60 text-amber-200">
                  {category.name || category.title || category.slug}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-amber-50 md:text-5xl">
            {post.title}
          </h1>

          {/* Meta information */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <time dateTime={post.publishedAt || post.createdAt}>
                {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </time>
            </div>
          </div>
        </header>

        {/* Article content */}
        <div className="prose prose-lg prose-invert prose-slate max-w-none">
          <div
            className="leading-relaxed prose-headings:font-heading prose-headings:tracking-tight prose-headings:text-amber-50 prose-p:text-slate-300 prose-a:text-amber-400 prose-a:no-underline hover:prose-a:text-amber-300 hover:prose-a:underline prose-strong:text-slate-200 prose-code:rounded prose-code:bg-slate-900/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-amber-300"
            dangerouslySetInnerHTML={{ __html: post.content || post.excerpt || 'Content not available' }}
          />
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <footer className="mt-12 border-t border-slate-800/60 pt-8">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-amber-300">Tags:</span>
              {post.tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="border-slate-700 text-slate-300">
                  #{tag.name}
                </Badge>
              ))}
            </div>
          </footer>
        )}

        {/* Back to blog */}
        <div className="mt-12 text-center">
          <Button asChild>
            <Link to="/blog">
              View All Posts
            </Link>
          </Button>
        </div>
      </article>
    </div>
  );
};

export default BlogPost;
