import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { BlogTag } from '@/types/blog';

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
  useBlogTags,
  useCreateBlogTag,
  useUpdateBlogTag,
  useDeleteBlogTag,
} from '@/hooks/blog/useBlogTaxonomy';
import { slugify } from '@/utils/slug';

interface TagFormValues {
  name: string;
  slug: string;
  description: string;
}

const DEFAULT_VALUES: TagFormValues = {
  name: '',
  slug: '',
  description: '',
};

export const BlogTagManager: React.FC = () => {
  const { data: tags = [], isLoading } = useBlogTags();
  const createTag = useCreateBlogTag();
  const updateTag = useUpdateBlogTag();
  const deleteTag = useDeleteBlogTag();

  const [editTarget, setEditTarget] = useState<BlogTag | null>(null);

  const createForm = useForm<TagFormValues>({ defaultValues: DEFAULT_VALUES });
  const editForm = useForm<TagFormValues>({ defaultValues: DEFAULT_VALUES });

  const createNameValue = createForm.watch('name');
  const editNameValue = editForm.watch('name');

  React.useEffect(() => {
    if (!createNameValue) {
      createForm.setValue('slug', '', { shouldDirty: false, shouldTouch: false });
      return;
    }
    if (createForm.formState.dirtyFields.slug) return;
    createForm.setValue('slug', slugify(createNameValue), { shouldDirty: false, shouldTouch: false });
  }, [createForm, createNameValue]);

  React.useEffect(() => {
    if (!editTarget) return;
    if (!editNameValue) {
      editForm.setValue('slug', '', { shouldDirty: false, shouldTouch: false });
      return;
    }
    if (editForm.formState.dirtyFields.slug) return;
    editForm.setValue('slug', slugify(editNameValue), { shouldDirty: false, shouldTouch: false });
  }, [editForm, editNameValue, editTarget]);

  const handleCreate = (values: TagFormValues) => {
    if (!values.name.trim()) {
      toast.error('Name is required');
      return;
    }
    createTag.mutate(
      {
        name: values.name.trim(),
        slug: slugify(values.slug || values.name),
        description: values.description.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Tag created');
          createForm.reset(DEFAULT_VALUES);
        },
        onError: (error: any) => toast.error(error.message || 'Failed to create tag'),
      }
    );
  };

  const openEditDialog = (tag: BlogTag) => {
    setEditTarget(tag);
    editForm.reset({
      name: tag.name,
      slug: tag.slug,
      description: tag.description ?? '',
    });
  };

  const handleEdit = (values: TagFormValues) => {
    if (!editTarget) return;
    updateTag.mutate(
      {
        id: editTarget.id,
        values: {
          name: values.name.trim(),
          slug: slugify(values.slug || values.name),
          description: values.description.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success('Tag updated');
          setEditTarget(null);
        },
        onError: (error: any) => toast.error(error.message || 'Failed to update tag'),
      }
    );
  };

  const handleDelete = (tag: BlogTag) => {
    deleteTag.mutate(tag.id, {
      onSuccess: () => toast.success('Tag deleted'),
      onError: (error: any) => toast.error(error.message || 'Failed to delete tag'),
    });
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Tags</CardTitle>
        <CardDescription>Label posts with keywords to improve discoverability.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...createForm}>
          <form onSubmit={createForm.handleSubmit(handleCreate)} className="grid gap-4">
            <FormField
              control={createForm.control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Lore" {...field} />
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
                    <Input placeholder="lore" {...field} />
                  </FormControl>
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
                    <Textarea placeholder="Optional description" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={createTag.isPending}>
                {createTag.isPending ? 'Creating…' : 'Add Tag'}
              </Button>
            </div>
          </form>
        </Form>
        <Separator />
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Existing Tags</h4>
            <Badge variant="secondary">{tags.length}</Badge>
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tags…</p>
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags defined yet. Add a tag to start organising content.</p>
          ) : (
            <ul className="space-y-3">
              {tags.map((tag) => (
                <li key={tag.id} className="flex items-start justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="font-medium">{tag.name}</p>
                    <p className="text-xs text-muted-foreground">/{tag.slug}</p>
                    {tag.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{tag.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Dialog
                      open={editTarget?.id === tag.id}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditTarget(null);
                          editForm.reset(DEFAULT_VALUES);
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(tag)}>
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Edit Tag</DialogTitle>
                        </DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
                            <FormField
                              control={editForm.control}
                              name="name"
                              rules={{ required: 'Name is required' }}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Name</FormLabel>
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
                              <Button type="submit" disabled={updateTag.isPending}>
                                {updateTag.isPending ? 'Saving…' : 'Save Changes'}
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
                          <AlertDialogTitle>Delete tag?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This removes the tag from all posts. You can create it again later if needed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tag)} disabled={deleteTag.isPending}>
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
      </CardContent>
    </Card>
  );
};
