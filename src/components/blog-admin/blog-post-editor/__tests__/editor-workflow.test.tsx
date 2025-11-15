import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BlogPostEditor } from '../blog-post-editor';

const mockCategories = [
  {
    id: 'cat-1',
    title: 'Technology',
    slug: 'technology',
    createdAt: '2024-01-01',
    updatedAt: null,
  },
  { id: 'cat-2', title: 'Design', slug: 'design', createdAt: '2024-01-01', updatedAt: null },
];

const mockTags = [
  { id: 'tag-1', name: 'React', slug: 'react', createdAt: '2024-01-01', updatedAt: null },
  { id: 'tag-2', name: 'TypeScript', slug: 'typescript', createdAt: '2024-01-01', updatedAt: null },
];

const mockCreatePost = vi.fn();
const mockUpdatePost = vi.fn();

vi.mock('@/hooks/blog/useBlogTaxonomy', () => ({
  useBlogCategories: () => ({
    data: mockCategories,
    isLoading: false,
  }),
  useBlogTags: () => ({
    data: mockTags,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/blog/useBlogPosts', () => ({
  useCreateBlogPost: () => ({
    mutateAsync: mockCreatePost,
    isPending: false,
  }),
  useUpdateBlogPost: () => ({
    mutateAsync: mockUpdatePost,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Blog Editor Happy Path Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreatePost.mockResolvedValue({
      id: 'new-post-1',
      title: 'My First Blog Post',
      slug: 'my-first-blog-post',
      content: '# Introduction\n\nThis is my first blog post.',
      status: 'draft',
    });
  });

  it('completes full workflow: create, edit, and publish a blog post', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<BlogPostEditor onSuccess={onSuccess} />, { wrapper: createWrapper() });

    expect(screen.getByText(/create blog post/i)).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'My First Blog Post');

    await waitFor(() => {
      const slugInput = screen.getByLabelText(/slug/i);
      expect(slugInput).toHaveValue('my-first-blog-post');
    });

    const contentTextarea = screen.getByPlaceholderText(/write your post content/i);
    await user.type(contentTextarea, '# Introduction\n\nThis is my first blog post.');

    const excerptTextarea = screen.getByLabelText(/excerpt/i);
    await user.type(excerptTextarea, 'A brief introduction to my first blog post');

    const submitButton = screen.getByRole('button', { name: /save draft/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My First Blog Post',
          slug: 'my-first-blog-post',
          content: expect.stringContaining('Introduction'),
          excerpt: expect.stringContaining('brief introduction'),
          status: 'draft',
        }),
      );
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('auto-generates excerpt from content', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test Post');

    const contentTextarea = screen.getByPlaceholderText(/write your post content/i);
    await user.type(
      contentTextarea,
      '# Main Heading\n\nThis is a long paragraph with lots of interesting content that should be trimmed down to create a nice excerpt for the post listing page.',
    );

    const autoGenerateButton = screen.getByRole('button', { name: /auto-generate/i });
    await user.click(autoGenerateButton);

    await waitFor(() => {
      const excerptTextarea = screen.getByLabelText(/excerpt/i);
      expect((excerptTextarea as HTMLTextAreaElement).value).toBeTruthy();
      expect((excerptTextarea as HTMLTextAreaElement).value).not.toContain('#');
    });
  });

  it('validates required fields before submission', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /save draft/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/content is required/i)).toBeInTheDocument();
    });

    expect(mockCreatePost).not.toHaveBeenCalled();
  });

  it('handles scheduling workflow', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Scheduled Post');

    const contentTextarea = screen.getByPlaceholderText(/write your post content/i);
    await user.type(contentTextarea, 'This post will be scheduled for future publication.');

    const statusSelect = screen.getByLabelText(/status/i);
    await user.click(statusSelect);

    const scheduledOption = await screen.findByRole('option', { name: /scheduled/i });
    await user.click(scheduledOption);

    await waitFor(() => {
      expect(screen.getByLabelText(/scheduled date/i)).toBeInTheDocument();
    });

    const scheduledDateInput = screen.getByLabelText(/scheduled date/i);
    await user.type(scheduledDateInput, '2025-12-31T10:00');

    const submitButton = screen.getByRole('button', { name: /schedule/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'scheduled',
          scheduledFor: expect.stringContaining('2025-12-31'),
        }),
      );
    });
  });

  it('switches between write and preview modes', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Preview Test');

    const contentTextarea = screen.getByPlaceholderText(/write your post content/i);
    await user.type(contentTextarea, '# Heading\n\n**Bold text** and *italic text*');

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    await user.click(previewTab);

    await waitFor(() => {
      const previewContainer = screen.getByText(/bold text/i);
      expect(previewContainer).toBeInTheDocument();
    });

    const writeTab = screen.getByRole('tab', { name: /write/i });
    await user.click(writeTab);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/write your post content/i)).toBeInTheDocument();
    });
  });

  it('populates SEO fields automatically', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'SEO Test Post');

    const excerptTextarea = screen.getByLabelText(/excerpt/i);
    await user.type(excerptTextarea, 'This is a test excerpt for SEO purposes');

    const autoPopulateButton = screen.getByRole('button', { name: /auto-populate seo/i });
    await user.click(autoPopulateButton);

    await waitFor(() => {
      const seoTitleInput = screen.getByLabelText(/seo title/i);
      expect((seoTitleInput as HTMLInputElement).value).toContain('SEO Test Post');

      const seoDescriptionTextarea = screen.getByLabelText(/seo description/i);
      expect((seoDescriptionTextarea as HTMLTextAreaElement).value).toContain('test excerpt');
    });
  });

  it('warns about unsaved changes when canceling', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<BlogPostEditor onCancel={onCancel} />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Unsaved Post');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    const continueButton = screen.getByRole('button', { name: /continue editing/i });
    await user.click(continueButton);

    expect(onCancel).not.toHaveBeenCalled();

    await user.click(cancelButton);

    const discardButton = screen.getByRole('button', { name: /discard changes/i });
    await user.click(discardButton);

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalled();
    });
  });

  it('updates existing post in edit mode', async () => {
    const user = userEvent.setup();

    mockUpdatePost.mockResolvedValue({
      id: 'existing-1',
      title: 'Updated Post Title',
      slug: 'existing-post',
      content: 'Updated content',
      status: 'published',
    });

    const existingPost = {
      id: 'existing-1',
      authorId: 'author-1',
      title: 'Original Post',
      slug: 'existing-post',
      content: 'Original content',
      status: 'draft' as const,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    render(<BlogPostEditor post={existingPost} />, { wrapper: createWrapper() });

    expect(screen.getByText(/edit blog post/i)).toBeInTheDocument();

    const titleInput = screen.getByLabelText(/title/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Post Title');

    const statusSelect = screen.getByLabelText(/status/i);
    await user.click(statusSelect);

    const publishedOption = await screen.findByRole('option', { name: /published/i });
    await user.click(publishedOption);

    const submitButton = screen.getByRole('button', { name: /publish/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdatePost).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Post Title',
          status: 'published',
          publishedAt: expect.any(String),
        }),
      );
    });
  });
});
