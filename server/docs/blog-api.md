# Blog CMS API Documentation

## Overview

The Blog API provides full CRUD operations for blog posts, categories, and tags with an advanced workflow system supporting draft→review→scheduled→published→archived states.

## Base URL

`/v1/blog`

## Authentication

Most endpoints require JWT authentication via the `Authorization: Bearer {token}` header.

### Permission Levels

- **Viewer**: Can read published posts
- **Author**: Can create and manage their own posts
- **Admin**: Full access to all posts and settings

## Endpoints

### Public Endpoints

#### GET /posts

List published blog posts.

**Query Parameters:**
- `page` (number, default: 1): Page number
- `pageSize` (number, default: 10, max: 100): Items per page
- `search` (string): Search in title and summary
- `category` (string): Filter by category slug or ID
- `tag` (string): Filter by tag slug or ID

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "my-post",
      "title": "My Post",
      "summary": "Short summary",
      "excerpt": "Auto-generated excerpt...",
      "featuredImageUrl": "https://example.com/image.jpg",
      "heroImageAlt": "Image description",
      "status": "published",
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "authorId": "uuid",
      "readingTimeMinutes": 5,
      "categories": [
        { "id": "uuid", "slug": "tech", "name": "Technology" }
      ],
      "tags": [
        { "id": "uuid", "slug": "ai", "name": "AI" }
      ],
      "url": "https://example.com/blog/my-post"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 42
  }
}
```

#### GET /posts/:slug

Get a single published post by slug with rendered HTML.

**Response:**
```json
{
  "id": "uuid",
  "slug": "my-post",
  "title": "My Post",
  "summary": "Short summary",
  "content": "# Markdown content...",
  "html": "<h1>Markdown content...</h1>",
  "excerpt": "Auto-generated excerpt...",
  "featuredImageUrl": "https://example.com/image.jpg",
  "heroImageAlt": "Image description",
  "seoTitle": "SEO optimized title",
  "seoDescription": "SEO description",
  "seoKeywords": ["keyword1", "keyword2"],
  "canonicalUrl": "https://example.com/blog/my-post",
  "status": "published",
  "publishedAt": "2024-01-01T00:00:00.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "authorId": "uuid",
  "readingTimeMinutes": 5,
  "metadata": {},
  "categories": [...],
  "tags": [...]
}
```

#### GET /categories

List all categories.

**Response:**
```json
[
  {
    "id": "uuid",
    "slug": "tech",
    "name": "Technology",
    "description": "Tech posts"
  }
]
```

#### GET /tags

List all tags.

**Response:** Same format as categories.

---

### Author/Admin Endpoints

#### GET /admin/posts

List all posts (admin sees all, authors see only their own).

**Query Parameters:** Same as `GET /posts`, plus:
- `status` (enum): Filter by status ('draft', 'review', 'scheduled', 'published', 'archived')
- `scheduledOnly` (boolean): Show only scheduled posts

**Auth Required:** Author or Admin

---

#### POST /posts

Create a new blog post.

**Auth Required:** Author or Admin

**Request Body:**
```json
{
  "title": "My New Post",
  "slug": "my-new-post",
  "summary": "Optional summary",
  "content": "# Markdown content",
  "featuredImageUrl": "https://example.com/image.jpg",
  "heroImageAlt": "Image description",
  "seoTitle": "SEO title",
  "seoDescription": "SEO description",
  "seoKeywords": ["keyword1", "keyword2"],
  "canonicalUrl": "https://example.com/blog/my-new-post",
  "status": "draft",
  "scheduledFor": "2024-12-31T00:00:00.000Z",
  "metadata": { "customField": "value" },
  "authorId": "uuid",
  "categoryIds": ["uuid1", "uuid2"],
  "tagIds": ["uuid1", "uuid2"]
}
```

**Notes:**
- `authorId` is only respected for admins; authors use their linked profile
- `status` defaults to 'draft'
- `scheduledFor` is required when `status` is 'scheduled'

**Response:** Created post object (201)

**Error Responses:**
- 400: Validation error or missing author profile
- 409: Slug already exists

---

#### PUT /posts/:id

Update an existing post.

**Auth Required:** Author (own posts) or Admin

**Request Body:** All fields from POST are optional (partial update)

**Response:** Updated post object (200)

**Error Responses:**
- 400: Validation error
- 403: Permission denied
- 404: Post not found
- 409: Slug already exists

---

#### DELETE /posts/:id

Delete a post and its relations.

**Auth Required:** Author (own posts) or Admin

**Response:** 204 No Content

**Error Responses:**
- 403: Permission denied
- 404: Post not found

---

### Lifecycle Endpoints

#### POST /posts/:id/publish

Publish a post immediately.

**Auth Required:** Author (own posts) or Admin

**Request Body:**
```json
{
  "publishedAt": "2024-01-01T00:00:00.000Z"
}
```

**Notes:**
- `publishedAt` defaults to current time if not provided

**Response:** Updated post object (200)

---

#### POST /posts/:id/schedule

Schedule a post for future publication.

**Auth Required:** Author (own posts) or Admin

**Request Body:**
```json
{
  "scheduledFor": "2024-12-31T00:00:00.000Z"
}
```

**Response:** Updated post object with status 'scheduled' (200)

---

#### POST /posts/:id/request-review

Move a draft post to review status.

**Auth Required:** Author (own posts) or Admin

**Response:** Updated post object with status 'review' (200)

---

#### POST /posts/:id/archive

Archive a post.

**Auth Required:** Author (own posts) or Admin

**Response:** Updated post object with status 'archived' (200)

---

#### GET /posts/:id/preview

Preview any post (including unpublished) with rendered HTML.

**Auth Required:** Author (own posts) or Admin

**Response:** Post object with HTML included

**Error Responses:**
- 403: Permission denied
- 404: Post not found

---

### Utility Endpoints

#### POST /slug/check

Check if a slug is available.

**Auth Required:** Author or Admin

**Request Body:**
```json
{
  "slug": "my-post-slug",
  "excludeId": "uuid"
}
```

**Notes:**
- `excludeId` is optional; use when updating an existing post

**Response:**
```json
{
  "available": true,
  "slug": "my-post-slug"
}
```

---

#### POST /media/sign-upload

Generate a signed URL for uploading media to Supabase Storage.

**Auth Required:** Admin

**Request Body:**
```json
{
  "path": "uploads/image.png",
  "contentType": "image/png"
}
```

**Response:**
```json
{
  "signedUrl": "https://...",
  "path": "uploads/image.png",
  "token": "..."
}
```

---

### Category Management (Admin Only)

#### POST /categories

Create a category.

**Request Body:**
```json
{
  "name": "Technology",
  "slug": "tech",
  "description": "Tech posts"
}
```

#### PUT /categories/:id

Update a category (partial).

#### DELETE /categories/:id

Delete a category (204).

---

### Tag Management (Admin Only)

Same as categories: POST, PUT, DELETE endpoints at `/tags` and `/tags/:id`.

---

## Status Workflow

```
draft → review → scheduled → published → archived
  ↓       ↓         ↓
  └───────┴─────────┘
```

- **draft**: Initial state, not visible publicly
- **review**: Submitted for review (optional workflow step)
- **scheduled**: Set to publish at a future date/time
- **published**: Live and visible to public
- **archived**: Hidden from public but retained

---

## Computed Fields

The following fields are automatically computed:

- **excerpt**: Generated from content if not provided in summary
- **html**: Sanitized HTML rendered from markdown content
- **readingTimeMinutes**: Calculated at ~200 words/minute
- **url**: Full public URL to the post

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message",
  "details": {} // Optional validation details
}
```

**Common Status Codes:**
- 400: Invalid request
- 401: Not authenticated
- 403: Permission denied
- 404: Not found
- 409: Conflict (duplicate slug)
- 500: Server error

---

## Markdown Support

Content is written in Markdown with:
- GitHub Flavored Markdown (GFM)
- Code blocks with syntax highlighting
- Tables, task lists, strikethrough
- Sanitized HTML output (XSS-safe)

---

## Best Practices

1. **Slugs**: Use lowercase, hyphenated URLs (validated via regex)
2. **SEO**: Provide `seoTitle`, `seoDescription`, and `seoKeywords` for better search visibility
3. **Images**: Upload via `/media/sign-upload` first, then reference URL in `featuredImageUrl`
4. **Scheduling**: Use `scheduledFor` with status 'scheduled' for future publishing
5. **Author Profile**: Authors must have a profile in `blog_authors` before creating posts

---

## Rate Limiting

No explicit rate limiting at the API level. Use responsibly.

---

## Changelog

- **v1.0** (2024): Initial release with full CRUD and workflow support
