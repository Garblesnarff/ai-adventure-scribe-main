import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { BlogCategory } from '@/types/blog';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  useBlogCategories,
  useCreateBlogCategory,
  useDeleteBlogCategory,
  useUpdateBlogCategory,
} from '@/hooks/blog/useBlogTaxonomy';
import { slugify } from '@/utils/slug';

interface CategoryFormValues {
  title: string;
  slug: string;
  description: string;
}

const DEFAULT_VALUES: CategoryFormValues = {
  title: '',
  slug: '',
  description: '',
};

export const BlogCategoryManager: React.FC = () => {
  const { data: categories = [], isLoading } = useBlogCategories();
  const createCategory = useCreateBlogCategory();
  const updateCategory = useUpdateBlogCategory();
  const deleteCategory = useDeleteBlogCategory();

  const [editTarget, setEditTarget] = useState<BlogCategory | null>(null);

  const createForm = useForm<CategoryFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const editForm = useForm<CategoryFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const createTitleValue = createForm.watch('title');
  const editTitleValue = editForm.watch('title');

  React.useEffect(() => {
    if (!createTitleValue) {
      createForm.setValue('slug', '', { shouldDirty: false, shouldTouch: false });
      return;
    }
    if (createForm.formState.dirtyFields.slug) {
      return;
    }
    createForm.setValue('slug', slugify(createTitleValue), { shouldDirty: false, shouldTouch: false });
  }, [createTitleValue, createForm]);

  React.useEffect(() => {
    if (!editTarget) return;
    if (!editTitleValue) {
      editForm.setValue('slug', '', { shouldDirty: false, shouldTouch: false });
      return;
    }
    if (editForm.formState.dirtyFields.slug) {
      return;
    }
    editForm.setValue('slug', slugify(editTitleValue), { shouldDirty: false, shouldTouch: false });
  }, [editForm, editTitleValue, editTarget]);

  const handleCreate = (values: CategoryFormValues) => {
    if (!values.title.trim()) {
      toast.error('Title is required');
      return;
    }
    createCategory.mutate(
      {
        title: values.title.trim(),
        slug: slugify(values.slug || values.title),
        description: values.description.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Category created');
          createForm.reset(DEFAULT_VALUES);
        },
        onError: (error: any) => {
          toast.error(error.message || 'Failed to create category');
        },
      }
    );
  };

  const openEditDialog = (category: BlogCategory) => {
    setEditTarget(category);
    editForm.reset({
      title: category.title,
      slug: category.slug,
      description: category.description ?? '',
    });
  };

  const handleEdit = (values: CategoryFormValues) => {
    if (!editTarget) return;
    updateCategory.mutate(
      {
        id: editTarget.id,
        values: {
          title: values.title.trim(),
          slug: slugify(values.slug || values.title),
          description: values.description.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Category updated');
          setEditTarget(null);
        },
        onError: (error: any) => toast.error(error.message || 'Failed to update category'),
      }
    );
  };

  const handleDelete = (category: BlogCategory) => {
    deleteCategory.mutate(category.id, {
      onSuccess: () => toast.success('Category deleted'),
      onError: (error: any) => toast.error(error.message || 'Failed to delete category'),
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>Organise posts by assigning descriptive categories.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="grid gap-4">
              <FormField
                control={createForm.control}
                name="title"
                rules={{ required: 'Title is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Game Design" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="game-design" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={createForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional summary for this category" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={createCategory.isPending}>
                  {createCategory.isPending ? 'Creating…' : 'Add Category'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Existing Categories</h4>
            <Badge variant="secondary">{categories.length}</Badge>
          </div>
          <div className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading categories…</p>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No categories yet. Create one to get started.</p>
            ) : (
              <ul className="space-y-3">
                {categories.map((category) => (
                  <li key={category.id} className="flex items-start justify-between rounded-md border border-border p-3">
                    <div>
                      <p className="font-medium">{category.title}</p>
                      <p className="text-xs text-muted-foreground">/{category.slug}</p>
                      {category.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Dialog
                        open={editTarget?.id === category.id}
                        onOpenChange={(open) => {
                          if (!open) {
                            setEditTarget(null);
                            editForm.reset(DEFAULT_VALUES);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Edit Category</DialogTitle>
                          </DialogHeader>
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
                              <FormField
                                control={editForm.control}
                                name="title"
                                rules={{ required: 'Title is required' }}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="slug"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Slug</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditTarget(null);
                                    editForm.reset(DEFAULT_VALUES);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={updateCategory.isPending}>
                                  {updateCategory.isPending ? 'Saving…' : 'Save Changes'}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete category?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the category from all posts. You can re-create it later if needed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(category)} disabled={deleteCategory.isPending}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
