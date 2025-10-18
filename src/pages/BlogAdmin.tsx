import React from 'react';
import { BlogCategoryManager } from '@/components/blog-admin/blog-category-manager';
import { BlogTagManager } from '@/components/blog-admin/blog-tag-manager';
import { useAuth } from '@/contexts/AuthContext';

const BlogAdmin: React.FC = () => {
  const { isBlogAdmin } = useAuth();

  if (!isBlogAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold">Not authorized</h1>
        <p className="text-sm text-muted-foreground">You need blog admin access.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Blog Admin</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <BlogCategoryManager />
        <BlogTagManager />
      </div>
    </div>
  );
};

export default BlogAdmin;
