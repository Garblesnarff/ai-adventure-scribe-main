import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { Save, Eye, Send, Calendar, Image as ImageIcon, Loader2 } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { MarkdownEditor } from './markdown-editor';
import { MediaManager } from './media-manager';
import { MultiSelect } from './multi-select';

import type { BlogPost, BlogPostStatus } from '@/types/blog';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCreateBlogPost, useUpdateBlogPost } from '@/hooks/blog/useBlogPosts';
import { useBlogCategories, useBlogTags } from '@/hooks/blog/useBlogTaxonomy';
import { slugify } from '@/utils/slug';
import { generateExcerpt } from '@/utils/text-helpers';

export const blogPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  excerpt: z.string().max(500, 'Excerpt must be 500 characters or less').optional(),
  content: z.string().min(1, 'Content is required'),
  coverImageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  status: z.enum(['draft', 'scheduled', 'published']),
  scheduledFor: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  seoTitle: z.string().max(60, 'SEO title should be 60 characters or less').optional(),
  seoDescription: z.string().max(160, 'SEO description should be 160 characters or less').optional(),
  allowComments: z.boolean().default(true),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

interface BlogPostEditorProps {
  post?: BlogPost;
  onSuccess?: (post: BlogPost) => void;
  onCancel?: () => void;
}

export const BlogPostEditor: React.FC<BlogPostEditorProps> = ({
  post,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = !!post;
  const [mediaManagerOpen, setMediaManagerOpen] = React.useState(false);
  const [unsavedChanges, setUnsavedChanges] = React.useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string>('');

  const { data: categories = [] } = useBlogCategories();
  const { data: tags = [] } = useBlogTags();
  const createMutation = useCreateBlogPost();
  const updateMutation = useUpdateBlogPost(post?.id);

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: post?.title || '',
      slug: post?.slug || '',
      excerpt: post?.excerpt || '',
      content: post?.content || '',
      coverImageUrl: post?.coverImageUrl || '',
      status: (post?.status as BlogPostStatus) || 'draft',
      scheduledFor: post?.scheduledFor || '',
      categoryIds: post?.categoryIds || [],
      tagIds: post?.tagIds || [],
      seoTitle: post?.seoTitle || '',
      seoDescription: post?.seoDescription || '',
      allowComments: post?.allowComments ?? true,
    },
  });

  const titleValue = form.watch('title');
  const contentValue = form.watch('content');
  const statusValue = form.watch('status');

  React.useEffect(() => {
    if (!titleValue || form.formState.dirtyFields.slug) return;
    form.setValue('slug', slugify(titleValue), { shouldDirty: false });
  }, [titleValue, form]);

  React.useEffect(() => {
    const subscription = form.watch(() => {
      setUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleAutoGenerateExcerpt = () => {
    const excerpt = generateExcerpt(contentValue, 200);
    form.setValue('excerpt', excerpt, { shouldDirty: true, shouldValidate: true });
    toast.success('Excerpt generated from content');
  };

  const handleAutoGenerateSEO = () => {
    const title = form.getValues('title');
    const excerpt = form.getValues('excerpt') || generateExcerpt(contentValue, 160);
    
    if (!form.getValues('seoTitle')) {
      form.setValue('seoTitle', title.substring(0, 60), { shouldDirty: true });
    }
    if (!form.getValues('seoDescription')) {
      form.setValue('seoDescription', excerpt.substring(0, 160), { shouldDirty: true });
    }
    
    toast.success('SEO fields populated');
  };

  const handleSelectMedia = (url: string) => {
    form.setValue('coverImageUrl', url, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: BlogPostFormValues) => {
    try {
      const payload = {
        title: values.title,
        slug: values.slug,
        content: values.content,
        excerpt: values.excerpt || null,
        coverImageUrl: values.coverImageUrl || null,
        status: values.status,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        scheduledFor: values.scheduledFor || null,
        publishedAt: values.status === 'published' ? new Date().toISOString() : null,
        categoryIds: values.categoryIds || [],
        tagIds: values.tagIds || [],
        allowComments: values.allowComments,
      };

      if (isEditMode) {
        const updated = await updateMutation.mutateAsync(payload);
        toast.success('Blog post updated successfully');
        setUnsavedChanges(false);
        onSuccess?.(updated);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast.success('Blog post created successfully');
        setUnsavedChanges(false);
        onSuccess?.(created);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save blog post');
    }
  };

  const handleCancel = () => {
    if (unsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onCancel?.();
    }
  };

  const handlePreview = () => {
    const previewData = form.getValues();
    const queryParams = new URLSearchParams({
      title: previewData.title,
      content: previewData.content,
      excerpt: previewData.excerpt || '',
      coverImageUrl: previewData.coverImageUrl || '',
    });
    setPreviewUrl(`/admin/blog/preview?${queryParams.toString()}`);
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    label: cat.title || cat.name || cat.slug,
  }));

  const tagOptions = tags.map((tag) => ({
    value: tag.id,
    label: tag.name,
  }));

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{isEditMode ? 'Edit Blog Post' : 'Create Blog Post'}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isEditMode ? 'Update your blog post details' : 'Fill in the details to create a new blog post'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : statusValue === 'published' ? (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Publish
                  </>
                ) : statusValue === 'scheduled' ? (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Draft
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>The core details of your blog post</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter post title..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug *</FormLabel>
                        <FormControl>
                          <Input placeholder="post-url-slug" {...field} />
                        </FormControl>
                        <FormDescription>
                          Auto-generated from title. Edit for custom URL.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Excerpt</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief summary of the post..."
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <div className="flex items-center justify-between">
                          <FormDescription>
                            Short summary displayed in post listings
                          </FormDescription>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleAutoGenerateExcerpt}
                          >
                            Auto-generate
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Content</CardTitle>
                  <CardDescription>Write your blog post in markdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <MarkdownEditor
                            value={field.value}
                            onChange={field.onChange}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>SEO Settings</CardTitle>
                  <CardDescription>Optimize for search engines</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="seoTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO-optimized title..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Max 60 characters. Leave empty to use post title.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="seoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Meta description for search results..."
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Max 160 characters. Leave empty to use excerpt.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoGenerateSEO}
                  >
                    Auto-populate SEO fields
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Publishing</CardTitle>
                  <CardDescription>Control post visibility and timing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {statusValue === 'scheduled' && (
                    <FormField
                      control={form.control}
                      name="scheduledFor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Scheduled Date *</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="allowComments"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Allow Comments</FormLabel>
                          <FormDescription className="text-xs">
                            Enable reader comments
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Featured Image</CardTitle>
                  <CardDescription>Main image for your post</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="coverImageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="space-y-2">
                            {field.value && (
                              <div className="relative aspect-video rounded-lg overflow-hidden border">
                                <img
                                  src={field.value}
                                  alt="Cover preview"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              onClick={() => setMediaManagerOpen(true)}
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              {field.value ? 'Change Image' : 'Select Image'}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Categories & Tags</CardTitle>
                  <CardDescription>Organize your content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="categoryIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categories</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={categoryOptions}
                            value={field.value || []}
                            onChange={field.onChange}
                            placeholder="Select categories..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tagIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <MultiSelect
                            options={tagOptions}
                            value={field.value || []}
                            onChange={field.onChange}
                            placeholder="Select tags..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>

      <MediaManager
        open={mediaManagerOpen}
        onOpenChange={setMediaManagerOpen}
        onSelectMedia={handleSelectMedia}
        currentMediaUrl={form.watch('coverImageUrl')}
      />

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedDialog(false);
                setUnsavedChanges(false);
                onCancel?.();
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewUrl && (
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl('')}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Preview</DialogTitle>
            </DialogHeader>
            <iframe
              src={previewUrl}
              className="w-full h-full border rounded"
              title="Blog Post Preview"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
