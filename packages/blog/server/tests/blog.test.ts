import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app';

process.env.SITE_URL = 'https://example.com';
process.env.BLOG_MEDIA_BUCKET = 'blog-media';

const fromMock = vi.fn();
const storageFromMock = vi.fn();
const getUserByIdMock = vi.fn();
const verifySupabaseTokenMock = vi.fn();

const fromQueues: Record<string, any[]> = {};
const storageBuckets: Record<string, any> = {};

function createBuilder(result: any) {
  const builder: any = {
    result,
    select: vi.fn(() => builder),
    insert: vi.fn((payload: any) => {
      builder.insertPayload = payload;
      return builder;
    }),
    update: vi.fn((payload: any) => {
      builder.updatePayload = payload;
      return builder;
    }),
    delete: vi.fn(() => {
      builder.deleteCalled = true;
      return builder;
    }),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    range: vi.fn(() => builder),
    single: vi.fn(() => Promise.resolve(result)),
    then: (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function enqueue(table: string, builder: any) {
  if (!fromQueues[table]) {
    fromQueues[table] = [];
  }
  fromQueues[table]!.push(builder);
}

function registerStorage(bucket: string, handler: any) {
  storageBuckets[bucket] = handler;
}

fromMock.mockImplementation((table: string) => {
  const queue = fromQueues[table];
  if (!queue || queue.length === 0) {
    throw new Error(`Unexpected Supabase table access: ${table}`);
  }
  return queue.shift();
});

storageFromMock.mockImplementation((bucket: string) => {
  const handler = storageBuckets[bucket];
  if (!handler) {
    throw new Error(`Unexpected storage bucket access: ${bucket}`);
  }
  return handler;
});

vi.mock('../src/lib/supabase.js', () => ({
  supabaseService: {
    from: fromMock,
    storage: { from: storageFromMock },
    auth: { admin: { getUserById: getUserByIdMock } },
  },
  verifySupabaseToken: verifySupabaseTokenMock,
  supabase: {},
}));

let agent: request.SuperTest<request.Test>;

describe('Blog router', () => {
  beforeEach(() => {
    Object.keys(fromQueues).forEach((key) => {
      fromQueues[key] = [];
    });
    Object.keys(storageBuckets).forEach((key) => {
      delete storageBuckets[key];
    });
    fromMock.mockClear();
    storageFromMock.mockClear();
    getUserByIdMock.mockReset();
    verifySupabaseTokenMock.mockReset();
    process.env.SITE_URL = 'https://example.com';
    process.env.BLOG_MEDIA_BUCKET = 'blog-media';

    const app = createApp();
    agent = request(app);
  });

  it('lists published posts with pagination and filters', async () => {
    const listResponse = {
      data: [
        {
          id: 'post-1',
          slug: 'magic-post',
          title: 'Magic Post',
          summary: 'Summary',
          content: 'Content',
          cover_image: 'cover.png',
          status: 'published',
          published_at: '2024-01-01T00:00:00.000Z',
          created_at: '2023-12-31T12:00:00.000Z',
          updated_at: '2023-12-31T12:00:00.000Z',
          author_id: 'author-1',
          categories: [{ category: { id: 'cat-1', slug: 'worldbuilding', name: 'Worldbuilding', description: null, created_at: '', updated_at: '' } }],
          tags: [{ tag: { id: 'tag-1', slug: 'magic', name: 'Magic', description: null, created_at: '', updated_at: '' } }],
        },
        {
          id: 'post-2',
          slug: 'another-post',
          title: 'Another Post',
          summary: 'Summary 2',
          content: 'Content 2',
          cover_image: null,
          status: 'published',
          published_at: '2024-01-02T00:00:00.000Z',
          created_at: '2023-12-30T12:00:00.000Z',
          updated_at: '2023-12-30T12:00:00.000Z',
          author_id: 'author-2',
          categories: [{ category: { id: 'cat-2', slug: 'lore', name: 'Lore', description: null, created_at: '', updated_at: '' } }],
          tags: [{ tag: { id: 'tag-2', slug: 'history', name: 'History', description: null, created_at: '', updated_at: '' } }],
        },
      ],
      error: null,
      count: 2,
    };

    enqueue('blog_posts', createBuilder(listResponse));

    const response = await agent.get('/v1/blog/posts?category=worldbuilding&page=1&pageSize=5');

    expect(response.status).toBe(200);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 5, total: 1 });
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].slug).toBe('magic-post');
    expect(response.body.data[0].url).toBe('https://example.com/blog/magic-post');
  });

  it('fetches a post by slug', async () => {
    const postResponse = {
      data: {
        id: 'post-1',
        slug: 'magic-post',
        title: 'Magic Post',
        summary: 'Summary',
        content: 'Content',
        cover_image: 'cover.png',
        status: 'published',
        published_at: '2024-01-01T00:00:00.000Z',
        created_at: '2023-12-31T12:00:00.000Z',
        updated_at: '2023-12-31T12:00:00.000Z',
        author_id: 'author-1',
        categories: [],
        tags: [],
      },
      error: null,
    };

    enqueue('blog_posts', createBuilder(postResponse));

    const response = await agent.get('/v1/blog/posts/magic-post');
    expect(response.status).toBe(200);
    expect(response.body.slug).toBe('magic-post');
    expect(response.body.title).toBe('Magic Post');
  });

  it('creates a post as blog admin', async () => {
    verifySupabaseTokenMock.mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com' });
    getUserByIdMock.mockResolvedValue({ data: { user: { id: 'admin-1', app_metadata: { blogRoles: ['admin'] } } }, error: null });

    const insertBuilder = createBuilder({ data: { id: 'new-post' }, error: null });
    const deleteCategoriesBuilder = createBuilder({ data: [], error: null });
    const insertCategoriesBuilder = createBuilder({ data: [], error: null });
    const deleteTagsBuilder = createBuilder({ data: [], error: null });
    const insertTagsBuilder = createBuilder({ data: [], error: null });
    const fetchBuilder = createBuilder({
      data: {
        id: 'new-post',
        slug: 'new-post',
        title: 'New Post',
        summary: 'New summary',
        content: 'New content',
        cover_image: 'cover.png',
        status: 'draft',
        published_at: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        author_id: 'admin-1',
        categories: [{ category: { id: 'cat-1', slug: 'worldbuilding', name: 'Worldbuilding', description: null, created_at: '', updated_at: '' } }],
        tags: [{ tag: { id: 'tag-1', slug: 'magic', name: 'Magic', description: null, created_at: '', updated_at: '' } }],
      },
      error: null,
    });

    enqueue('blog_posts', insertBuilder);
    enqueue('blog_post_categories', deleteCategoriesBuilder);
    enqueue('blog_post_categories', insertCategoriesBuilder);
    enqueue('blog_post_tags', deleteTagsBuilder);
    enqueue('blog_post_tags', insertTagsBuilder);
    enqueue('blog_posts', fetchBuilder);

    const response = await agent
      .post('/v1/blog/posts')
      .set('Authorization', 'Bearer token')
      .send({
        title: 'New Post',
        slug: 'new-post',
        summary: 'New summary',
        content: 'New content',
        coverImage: 'cover.png',
        categoryIds: ['cat-1'],
        tagIds: ['tag-1'],
      });

    expect(response.status).toBe(201);
    expect(insertBuilder.insert).toHaveBeenCalled();
    expect(insertCategoriesBuilder.insertPayload).toEqual([{ post_id: 'new-post', category_id: 'cat-1' }]);
    expect(insertTagsBuilder.insertPayload).toEqual([{ post_id: 'new-post', tag_id: 'tag-1' }]);
    expect(response.body.slug).toBe('new-post');
    expect(response.body.categories).toHaveLength(1);
  });

  it('rejects non-admin users for protected routes', async () => {
    verifySupabaseTokenMock.mockResolvedValue({ userId: 'user-2', email: 'user@example.com' });
    getUserByIdMock.mockResolvedValue({ data: { user: { id: 'user-2', app_metadata: { blogRoles: [] } } }, error: null });

    const response = await agent
      .post('/v1/blog/posts')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Nope', slug: 'nope' });

    expect(response.status).toBe(403);
    expect(fromMock).not.toHaveBeenCalledWith('blog_posts');
  });

  it('generates signed upload URLs for media', async () => {
    verifySupabaseTokenMock.mockResolvedValue({ userId: 'admin-1', email: 'admin@example.com' });
    getUserByIdMock.mockResolvedValue({ data: { user: { id: 'admin-1', app_metadata: { blogRoles: ['admin'] } } }, error: null });

    const storageHandler = {
      createSignedUploadUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: 'signed-url', path: 'uploads/image.png', token: 'token' },
        error: null,
      }),
    };

    registerStorage('blog-media', storageHandler);

    const response = await agent
      .post('/v1/blog/media/sign-upload')
      .set('Authorization', 'Bearer token')
      .send({ path: 'uploads/image.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.signedUrl).toBe('signed-url');
    expect(storageHandler.createSignedUploadUrl).toHaveBeenCalledWith('uploads/image.png');
  });
});
