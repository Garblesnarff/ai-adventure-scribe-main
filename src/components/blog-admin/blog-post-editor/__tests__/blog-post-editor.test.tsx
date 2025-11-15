import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { BlogPostEditor } from '../blog-post-editor';

import type { BlogPost } from '@/types/blog';

vi.mock('@/hooks/blog/useBlogTaxonomy', () => ({
  useBlogCategories: () => ({
    data: [
      { id: '1', title: 'Tech', slug: 'tech', createdAt: '2024-01-01', updatedAt: null },
      { id: '2', title: 'Design', slug: 'design', createdAt: '2024-01-01', updatedAt: null },
    ],
  }),
  useBlogTags: () => ({
    data: [
      { id: '1', name: 'React', slug: 'react', createdAt: '2024-01-01', updatedAt: null },
      { id: '2', name: 'TypeScript', slug: 'typescript', createdAt: '2024-01-01', updatedAt: null },
    ],
  }),
}));

vi.mock('@/hooks/blog/useBlogPosts', () => ({
  useCreateBlogPost: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: '1' }),
    isPending: false,
  }),
  useUpdateBlogPost: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: '1' }),
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

describe('BlogPostEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/excerpt/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('auto-generates slug from title', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    const slugInput = screen.getByLabelText(/slug/i);

    await user.type(titleInput, 'My First Blog Post');

    await waitFor(() => {
      expect(slugInput).toHaveValue('my-first-blog-post');
    });
  });

  it('populates form with existing post data in edit mode', () => {
    const existingPost: BlogPost = {
      id: '1',
      authorId: 'author-1',
      title: 'Existing Post',
      slug: 'existing-post',
      excerpt: 'Test excerpt',
      content: 'Test content',
      status: 'draft',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    render(<BlogPostEditor post={existingPost} />, { wrapper: createWrapper() });

    expect(screen.getByLabelText(/title/i)).toHaveValue('Existing Post');
    expect(screen.getByLabelText(/slug/i)).toHaveValue('existing-post');
    expect(screen.getByLabelText(/excerpt/i)).toHaveValue('Test excerpt');
  });

  it('shows validation error for empty title', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const submitButton = screen.getByRole('button', { name: /save draft/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid slug format', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    const slugInput = screen.getByLabelText(/slug/i);

    await user.type(titleInput, 'Test Post');
    await user.clear(slugInput);
    await user.type(slugInput, 'Invalid Slug With Spaces');

    const submitButton = screen.getByRole('button', { name: /save draft/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/slug must be lowercase with hyphens/i)).toBeInTheDocument();
    });
  });

  it('shows scheduled date field when status is scheduled', async () => {
    const user = userEvent.setup();
    render(<BlogPostEditor />, { wrapper: createWrapper() });

    const statusSelect = screen.getByLabelText(/status/i);
    await user.click(statusSelect);

    const scheduledOption = screen.getByRole('option', { name: /scheduled/i });
    await user.click(scheduledOption);

    await waitFor(() => {
      expect(screen.getByLabelText(/scheduled date/i)).toBeInTheDocument();
    });
  });

  it('calls onSuccess callback after successful creation', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<BlogPostEditor onSuccess={onSuccess} />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'New Post');

    const contentTextarea = screen.getByPlaceholderText(/write your post content/i);
    await user.type(contentTextarea, 'Post content goes here');

    const submitButton = screen.getByRole('button', { name: /save draft/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('displays unsaved changes warning when trying to cancel with changes', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(<BlogPostEditor onCancel={onCancel} />, { wrapper: createWrapper() });

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Changed Title');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });
  });
});
