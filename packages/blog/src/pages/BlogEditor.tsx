import { ArrowLeft, Save, Send } from 'lucide-react';
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useBlogPostById } from '@/hooks/blog/useBlogPosts';

const BlogEditor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { isBlogAdmin } = useAuth();
  const isNewPost = !id || id === 'new';

  const { data: post, isLoading, error } = useBlogPostById(isNewPost ? undefined : id);

  if (!isBlogAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-destructive">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            Blog admin privileges are required to access this area.
          </p>
        </div>
      </div>
    );
  }

  if (!isNewPost && isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Loading post...</p>
      </div>
    );
  }

  if (!isNewPost && error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Failed to load post'}
          </p>
        </div>
      </div>
    );
  }

  if (!isNewPost && !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-muted-foreground">Post not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/blog')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isNewPost ? 'New Blog Post' : `Edit: ${post?.title || 'Untitled'}`}
            </h1>
            {!isNewPost && post && (
              <p className="mt-1 text-sm text-muted-foreground">/{post.slug}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button size="sm">
            <Send className="mr-2 h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <p className="text-center text-muted-foreground">Blog editor coming soon</p>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            A rich text editor with markdown support, image uploads, and metadata management will be
            added here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlogEditor;
