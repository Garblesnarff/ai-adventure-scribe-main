import { FileText, FolderTree, Tags, Image } from 'lucide-react';
import React from 'react';

import { BlogCategoryManager } from '@/components/blog-admin/blog-category-manager';
import { BlogMediaManager } from '@/components/blog-admin/blog-media-manager';
import { BlogPostsList } from '@/components/blog-admin/blog-posts-list';
import { BlogTagManager } from '@/components/blog-admin/blog-tag-manager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';

const BlogAdmin: React.FC = () => {
  const { isBlogAdmin } = useAuth();

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Blog Administration</h1>
        <p className="mt-2 text-muted-foreground">
          Manage posts, categories, tags, and media for the Infinite Realms blog.
        </p>
      </div>

      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="posts" className="gap-2">
            <FileText className="h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="tags" className="gap-2">
            <Tags className="h-4 w-4" />
            Tags
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-2">
            <Image className="h-4 w-4" />
            Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          <BlogPostsList />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <BlogCategoryManager />
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <BlogTagManager />
        </TabsContent>

        <TabsContent value="media" className="space-y-4">
          <BlogMediaManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BlogAdmin;
