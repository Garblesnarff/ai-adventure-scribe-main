import { format } from 'date-fns';
import {
  Plus,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Edit,
  Eye,
  Upload,
  Undo2,
  Trash2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { BlogStatusBadge } from './blog-status-badge';

import type { BlogPost, BlogPostStatus, BlogPostListFilters } from '@/types/blog';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useBlogPosts,
  useUpdateBlogPostById,
  useDeleteBlogPost,
} from '@/hooks/blog/useBlogPosts';
import { useBlogCategories, useBlogTags } from '@/hooks/blog/useBlogTaxonomy';


const STATUS_FILTERS: Array<{ value: BlogPostStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'In Review' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

type SortField = 'updatedAt' | 'createdAt' | 'title' | 'status' | 'publishedAt';

const safeFormatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, yyyy');
};

export const BlogPostsList: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<BlogPostListFilters>({
    status: 'all',
    search: '',
    scheduledOnly: false,
    sortBy: 'updatedAt',
    sortDirection: 'desc',
  });
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);

  const { data: categories = [] } = useBlogCategories();
  const { data: tags = [] } = useBlogTags();
  const { data: posts = [], isLoading, error } = useBlogPosts(filters);
  const updatePost = useUpdateBlogPostById();
  const deletePost = useDeleteBlogPost();

  const categoryLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    categories.forEach((category) => {
      lookup.set(category.id, category.title);
    });
    return lookup;
  }, [categories]);

  const tagLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    tags.forEach((tag) => {
      lookup.set(tag.id, tag.name);
    });
    return lookup;
  }, [tags]);

  const handleSort = (field: SortField) => {
    setFilters((prev) => {
      if (prev.sortBy === field) {
        return {
          ...prev,
          sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        ...prev,
        sortBy: field,
        sortDirection: field === 'title' ? 'asc' : 'desc',
      };
    });
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (filters.sortBy !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden />;
    }
    return filters.sortDirection === 'asc' ? (
      <ChevronUp className="ml-2 h-4 w-4" aria-hidden />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
    );
  };

  const handlePublish = async (post: BlogPost) => {
    setActionTargetId(post.id);
    try {
      await updatePost.mutateAsync({
        id: post.id,
        input: {
          status: 'published',
          publishedAt: post.publishedAt || new Date().toISOString(),
          scheduledFor: null,
        },
      });
      toast.success('Post published successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish post';
      toast.error(message);
    } finally {
      setActionTargetId(null);
    }
  };

  const handleUnpublish = async (post: BlogPost) => {
    setActionTargetId(post.id);
    try {
      await updatePost.mutateAsync({
        id: post.id,
        input: {
          status: 'draft',
          publishedAt: null,
          scheduledFor: null,
        },
      });
      toast.success('Post unpublished');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unpublish post';
      toast.error(message);
    } finally {
      setActionTargetId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionTargetId(deleteTarget.id);
    try {
      await deletePost.mutateAsync(deleteTarget.id);
      toast.success('Post deleted');
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete post';
      toast.error(message);
    } finally {
      setActionTargetId(null);
    }
  };

  const isActionPending = (postId: string) => updatePost.isPending && actionTargetId === postId;
  const errorMessage = error instanceof Error ? error.message : undefined;

  const hasActiveFilters = Boolean(
    filters.search?.trim() ||
      (filters.status && filters.status !== 'all') ||
      filters.categoryId ||
      filters.tagId ||
      filters.scheduledOnly
  );

  const renderTagBadges = (tagIds?: string[]) => {
    if (!tagIds || tagIds.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
    const names = tagIds
      .map((id) => tagLookup.get(id))
      .filter((name): name is string => Boolean(name));
    if (names.length === 0) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {names.slice(0, 2).map((name) => (
          <Badge key={name} variant="secondary" className="text-xs">
            {name}
          </Badge>
        ))}
        {names.length > 2 ? (
          <Badge variant="secondary" className="text-xs">
            +{names.length - 2}
          </Badge>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="gap-2 md:flex md:items-center md:justify-between">
        <div>
          <CardTitle>Blog Posts</CardTitle>
          <CardDescription>
            Manage drafts, scheduled entries, and published stories for Infinite Realms.
          </CardDescription>
        </div>
        <Button onClick={() => navigate('/app/blog/posts/new')} className="gap-2" size="sm">
          <Plus className="h-4 w-4" />
          New Post
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
                aria-label="Search blog posts"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value as BlogPostStatus | 'all' }))
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {categories.length > 0 ? (
                <Select
                  value={filters.categoryId || 'all'}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      categoryId: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {tags.length > 0 ? (
                <Select
                  value={filters.tagId || 'all'}
                  onValueChange={(value) =>
                    setFilters((prev) => ({
                      ...prev,
                      tagId: value === 'all' ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Filter tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>
          <div className="inline-flex items-center gap-3 rounded-md border border-border px-3 py-2">
            <Switch
              id="scheduled-only"
              checked={Boolean(filters.scheduledOnly)}
              onCheckedChange={(checked) =>
                setFilters((prev) => ({ ...prev, scheduledOnly: checked }))
              }
            />
            <Label htmlFor="scheduled-only" className="text-sm">
              Show scheduled only
            </Label>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
            <span className="ml-3 text-sm text-muted-foreground">Loading posts…</span>
          </div>
        ) : errorMessage ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{errorMessage}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? 'No posts match your filters. Try adjusting them to see more results.'
                : 'No posts yet. Create your first entry to begin sharing your worlds.'}
            </p>
            {!hasActiveFilters ? (
              <Button onClick={() => navigate('/app/blog/posts/new')} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create your first post
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-semibold"
                          onClick={() => handleSort('title')}
                        >
                          Title
                          <SortIcon field="title" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-semibold"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          <SortIcon field="status" />
                        </Button>
                      </TableHead>
                      <TableHead className="w-40">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-semibold"
                          onClick={() => handleSort('updatedAt')}
                        >
                          Updated
                          <SortIcon field="updatedAt" />
                        </Button>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">Category</TableHead>
                      <TableHead className="hidden lg:table-cell">Tags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.map((post) => {
                      const categoryName = post.categoryIds?.map((id) => categoryLookup.get(id)).find(Boolean);
                      const isPending = isActionPending(post.id);
                      return (
                        <TableRow key={post.id} data-state={isPending ? 'loading' : undefined}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium leading-tight">
                                {post.title || 'Untitled post'}
                              </span>
                              <span className="text-xs text-muted-foreground">/{post.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <BlogStatusBadge status={post.status} />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {safeFormatDate(post.updatedAt)}
                            </span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {categoryName ? (
                              <Badge variant="outline" className="text-xs">
                                {categoryName}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">{renderTagBadges(post.tagIds)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/app/blog/posts/${post.id}`)}
                                aria-label={`Edit ${post.title}`}
                                disabled={isPending}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/blog/${post.slug}`, '_blank', 'noopener')}
                                aria-label={`Preview ${post.title}`}
                                disabled={isPending}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {post.status === 'published' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnpublish(post)}
                                  aria-label={`Unpublish ${post.title}`}
                                  disabled={isPending}
                                >
                                  {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Undo2 className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : post.status !== 'archived' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handlePublish(post)}
                                  aria-label={`Publish ${post.title}`}
                                  disabled={isPending}
                                >
                                  {isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(post)}
                                aria-label={`Delete ${post.title}`}
                                className="text-destructive hover:text-destructive"
                                disabled={actionTargetId === post.id && deletePost.isPending}
                              >
                                {actionTargetId === post.id && deletePost.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="grid gap-3 md:hidden">
              {posts.map((post) => {
                const categoryName = post.categoryIds?.map((id) => categoryLookup.get(id)).find(Boolean);
                const isPending = isActionPending(post.id);
                return (
                  <div key={post.id} className="space-y-3 rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{post.title || 'Untitled post'}</p>
                        <p className="text-xs text-muted-foreground">/{post.slug}</p>
                      </div>
                      <BlogStatusBadge status={post.status} />
                    </div>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>Updated</span>
                        <span>{safeFormatDate(post.updatedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Category</span>
                        <span>{categoryName ?? '—'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {renderTagBadges(post.tagIds)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/app/blog/posts/${post.id}`)}
                        disabled={isPending}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`/blog/${post.slug}`, '_blank', 'noopener')}
                        disabled={isPending}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                      </Button>
                      {post.status === 'published' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleUnpublish(post)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Undo2 className="mr-2 h-4 w-4" />
                          )}
                          Unpublish
                        </Button>
                      ) : post.status !== 'archived' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePublish(post)}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Publish
                        </Button>
                      ) : null}
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => setDeleteTarget(post)}
                        disabled={actionTargetId === post.id && deletePost.isPending}
                      >
                        {actionTargetId === post.id && deletePost.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove “{deleteTarget?.title}”. You can’t undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePost.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deletePost.isPending}>
              {deletePost.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
