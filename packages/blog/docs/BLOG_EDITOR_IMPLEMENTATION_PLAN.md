# Blog Editor & AI Content Integration Implementation Plan

## Overview
Comprehensive implementation of a full-featured blog editor allowing manual post creation and programmatic AI-generated content publishing. This plan covers frontend UI, backend APIs, AI integration, and testing.

---

## Current State

### ✅ Already Implemented
- Blog database schema (blog_posts, blog_categories, blog_tags, blog_post_categories, blog_post_tags)
- Blog service layer with CRUD operations
- Media manager with Supabase Storage integration
- BlogAdmin dashboard with tabs for posts, categories, tags, media
- Basic BlogEditor component (placeholder)
- Type definitions for blog entities

### ❌ Needs Implementation
- Rich text editor (markdown support)
- Blog post form with all metadata fields
- Image insertion and link tools
- Category/tag selection UI
- SEO fields (title, description, keywords)
- Publish/schedule workflow
- Auto-save drafts
- AI content creation API endpoint
- AI agent integration layer
- Editor-specific hooks and state management

---

## Architecture Overview

### Frontend Layer
- **Rich Text Editor**: TipTap + Markdown support
- **Form Components**: Title, slug, excerpt, SEO fields, categories, tags
- **Media Integration**: Inline image/link insertion from media library
- **Status Management**: Draft/Review/Scheduled/Published states
- **Auto-save**: Every 30 seconds with debounce

### Backend Layer (Express)
- **Blog Editor API**: POST /v1/blog/posts, PUT /v1/blog/posts/:id
- **AI Content API**: POST /v1/blog/ai/create-post (authentication required)
- **Slug Generation**: POST /v1/blog/slugs/generate
- **Content Validation**: Title/slug uniqueness, markdown validation
- **Scheduling**: Cron job to publish scheduled posts

### AI Integration Layer
- **Agent Interface**: Standardized schema for AI agents to submit content
- **Content Validation**: Verify AI-generated content meets quality standards
- **Author Attribution**: Link posts to AI agents or system user
- **Audit Trail**: Track all AI-generated posts with timestamps

---

## Detailed Work Units

### Phase 1: Core Editor Components (Est: 40 hours)

#### 1.1 Install & Configure TipTap Editor
- [ ] Install @tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-markdown
- [ ] Create TipTapEditor.tsx wrapper component
- [ ] Configure extensions: Heading, Bold, Italic, Code, CodeBlock, BulletList, OrderedList, Link, Image
- [ ] Add markdown parsing and serialization
- [ ] Implement custom keybindings (Ctrl+Z for undo, etc)
- [ ] Add editor toolbar with formatting buttons
- [ ] Test markdown input/output correctness

#### 1.2 Create BlogPostForm Component
- [ ] Title field (required, min 5 chars, max 200 chars)
- [ ] Auto-generate slug field with live update (slugify title)
- [ ] Excerpt field (textarea, max 300 chars, optional)
- [ ] Rich text editor integration
- [ ] Cover image upload/selection from media library
- [ ] SEO fields (title, description, 160 chars limit)
- [ ] Status dropdown (draft/review/scheduled/published)
- [ ] Publish date/time picker (if scheduled)
- [ ] Draft save timestamp display

#### 1.3 Create Category/Tag Selector
- [ ] Multi-select dropdown for categories
- [ ] Multi-select dropdown for tags
- [ ] Option to create new categories/tags inline
- [ ] Display selected items as removable chips
- [ ] Validation: max 5 categories, max 10 tags

#### 1.4 Create Media Insertion Widget
- [ ] "Insert Image" button in toolbar
- [ ] Modal to browse media library
- [ ] Drag & drop to add images
- [ ] Image caption/alt text input
- [ ] Insert as inline image or figure
- [ ] "Insert Link" button with URL input
- [ ] Link text/title fields

#### 1.5 Create Auto-Save Mechanism
- [ ] Save post every 30 seconds (debounced)
- [ ] Show "Saving..." and "Saved" indicators
- [ ] Track unsaved changes
- [ ] Prevent navigation loss with confirmation
- [ ] Store draft metadata (last saved, saved by, version)

---

### Phase 2: Editor Hooks & State Management (Est: 20 hours)

#### 2.1 Create usePostEditor Hook
- [ ] Manage post form state
- [ ] Track form dirty/clean status
- [ ] Handle validation and errors
- [ ] Provide save/publish/schedule functions
- [ ] Cancel/revert to last saved

#### 2.2 Create useMediaLibrary Hook
- [ ] Fetch available media assets
- [ ] Track selected media for insertion
- [ ] Support filtering by type (image, video, etc)
- [ ] Pagination for large libraries

#### 2.3 Create useSlugGeneration Hook
- [ ] Auto-slug generation from title
- [ ] Slug validation (unique, no duplicates)
- [ ] Manual slug editing with automatic validation
- [ ] Debounce API calls

#### 2.4 Create usePostAutoSave Hook
- [ ] Auto-save interval management
- [ ] Conflict detection (edited elsewhere)
- [ ] Save state management
- [ ] Error handling and retry logic

---

### Phase 3: Complete BlogEditor Component (Est: 25 hours)

#### 3.1 Integrate All Components
- [ ] Combine form, editor, media widget
- [ ] Layout: Sidebar (form fields) + Main (editor)
- [ ] Or: Tabs (Content, SEO, Settings)

#### 3.2 Implement Workflow
- [ ] New post initialization
- [ ] Load existing post
- [ ] Edit and save
- [ ] Preview post
- [ ] Publish vs Schedule logic
- [ ] Draft status handling

#### 3.3 Add Advanced Features
- [ ] Markdown preview mode toggle
- [ ] Word count display
- [ ] Reading time estimate
- [ ] Content analysis (SEO score)
- [ ] Related posts suggestion
- [ ] Revision history (optional first phase)

#### 3.4 Error Handling
- [ ] Network error recovery
- [ ] Validation error display
- [ ] Conflict resolution (race conditions)
- [ ] Fallback UI states

---

### Phase 4: Backend API Enhancement (Est: 30 hours)

#### 4.1 Create Blog API Endpoints
- [ ] POST /v1/blog/posts (create)
- [ ] PUT /v1/blog/posts/:id (update)
- [ ] DELETE /v1/blog/posts/:id (delete)
- [ ] GET /v1/blog/posts/:id (fetch single)
- [ ] POST /v1/blog/posts/:id/publish (publish)
- [ ] POST /v1/blog/posts/:id/schedule (schedule)
- [ ] POST /v1/blog/posts/import-draft (import from markdown)

#### 4.2 Input Validation Layer
- [ ] Title: required, 5-200 chars, no special chars
- [ ] Slug: required, unique, lowercase, no spaces
- [ ] Content: required, valid markdown
- [ ] Excerpt: optional, max 300 chars
- [ ] SEO title: optional, max 60 chars
- [ ] SEO description: optional, max 160 chars

#### 4.3 Slug Generation API
- [ ] POST /v1/blog/slugs/generate (accept title, return slug)
- [ ] Check uniqueness
- [ ] Handle collision with auto-increment

#### 4.4 Content Processing
- [ ] Extract first 200 chars as excerpt if not provided
- [ ] Generate SEO description if not provided
- [ ] Parse markdown for word count
- [ ] Extract image URLs for og:image

#### 4.5 Scheduling System
- [ ] POST /v1/blog/posts/:id/schedule (with publishAt time)
- [ ] Cron job to check and publish scheduled posts
- [ ] Webhook/event for scheduled post publication

#### 4.6 Revision/History (Phase 2)
- [ ] Create blog_post_revisions table
- [ ] Store changes on every save
- [ ] Allow revert to previous version
- [ ] Show diff view between versions

---

### Phase 5: AI Content Integration (Est: 35 hours)

#### 5.1 Create AI Content API
- [ ] POST /v1/blog/ai/create-post (AI agents submit content)
- [ ] Request schema validation
- [ ] Response with created post ID and URL

**Request Schema:**
```json
{
  "title": "string",
  "slug": "string",
  "content": "string (markdown)",
  "excerpt": "string",
  "coverImageUrl": "string (optional)",
  "seoTitle": "string (optional)",
  "seoDescription": "string (optional)",
  "categories": ["string"],
  "tags": ["string"],
  "authorAgent": "string (e.g., 'claude-ai', 'gpt-4')",
  "status": "draft" | "published",
  "publishedAt": "ISO8601 (if published)"
}
```

#### 5.2 AI Content Validation
- [ ] Title: required, appropriate length
- [ ] Content: not empty, basic quality check
- [ ] Slug: valid format, unique
- [ ] Categories/tags: exist in system
- [ ] Return validation errors with specific issues

#### 5.3 Authentication for AI Agents
- [ ] Create service account for AI agents
- [ ] Issue API token/JWT
- [ ] Validate token on /v1/blog/ai/* endpoints
- [ ] Rate limiting: max 10 posts/day per agent

#### 5.4 Author Attribution
- [ ] Create 'AI Authors' for each agent type
- [ ] Link posts to AI author records
- [ ] Display "Written by AI" badge
- [ ] Track AI contribution stats

#### 5.5 AI Content Approval Workflow (Optional)
- [ ] Posts created by AI start as "review" status
- [ ] Admin must approve before publishing
- [ ] Review interface with AI metadata
- [ ] Accept/reject with comments
- [ ] Automatically approved after 7 days

#### 5.6 Agent Integration Documentation
- [ ] Create /docs/ai-blog-integration.md with:
  - [ ] API endpoint and authentication
  - [ ] Request/response examples
  - [ ] Validation rules
  - [ ] Error codes and handling
  - [ ] Rate limits
  - [ ] Python/Node.js SDK examples

---

### Phase 6: Testing & Quality Assurance (Est: 30 hours)

#### 6.1 Frontend Unit Tests
- [ ] TipTapEditor: markdown parsing, serialization
- [ ] BlogPostForm: validation, required fields
- [ ] Media widget: image insertion, URL generation
- [ ] Slug generator: collision detection, formatting
- [ ] Auto-save: debounce, conflict detection

#### 6.2 Frontend Integration Tests
- [ ] Create new post flow (form → editor → save)
- [ ] Edit existing post (load → modify → save)
- [ ] Publish workflow (draft → published)
- [ ] Schedule workflow (set date → auto-publish)
- [ ] Media insertion (select → insert → render)

#### 6.3 E2E Tests (Playwright)
- [ ] Navigate to /app/blog/posts/new
- [ ] Fill form fields
- [ ] Upload image
- [ ] Insert image in editor
- [ ] Save draft
- [ ] Edit draft
- [ ] Publish post
- [ ] Verify on /blog/:slug

#### 6.4 Backend API Tests
- [ ] POST /v1/blog/posts (create post)
- [ ] PUT /v1/blog/posts/:id (update)
- [ ] DELETE /v1/blog/posts/:id (delete)
- [ ] Validation tests (invalid title, duplicate slug, etc)
- [ ] Auth tests (unauthorized access)
- [ ] Scheduling tests (publish on schedule)

#### 6.5 AI Integration Tests
- [ ] POST /v1/blog/ai/create-post (valid payload)
- [ ] Invalid payloads (missing fields, bad content)
- [ ] Rate limiting (> 10 posts/day)
- [ ] Auth errors (invalid token)
- [ ] Verify post created with AI author
- [ ] Check revision tracking

#### 6.6 Performance Tests
- [ ] Large markdown content (>10,000 chars)
- [ ] Multiple images in editor
- [ ] Auto-save under slow network
- [ ] Media library with 1000+ assets
- [ ] Load times and memory usage

---

### Phase 7: Documentation & Deployment (Est: 15 hours)

#### 7.1 User Documentation
- [ ] Blog Editor User Guide
- [ ] Markdown syntax reference
- [ ] SEO best practices
- [ ] Image optimization tips
- [ ] Publishing workflow explanation

#### 7.2 AI Agent Developer Guide
- [ ] /docs/ai-blog-integration.md
- [ ] API authentication setup
- [ ] Request/response examples
- [ ] Python SDK/client library
- [ ] Node.js client library
- [ ] Error handling patterns
- [ ] Rate limiting and quotas

#### 7.3 Admin Documentation
- [ ] Blog admin dashboard guide
- [ ] Media library management
- [ ] Category/tag organization
- [ ] User role management
- [ ] Content moderation for AI posts

#### 7.4 Database Migrations
- [ ] blog_post_revisions table (history tracking)
- [ ] blog_ai_authors table (AI agent tracking)
- [ ] Indexes for performance
- [ ] RLS policies for security

#### 7.5 Environment Configuration
- [ ] AI_BLOG_API_TOKEN (for agents)
- [ ] AI_BLOG_RATE_LIMIT (posts/day)
- [ ] AUTO_PUBLISH_SCHEDULE_INTERVAL (cron)
- [ ] AI_POST_APPROVAL_REQUIRED (boolean)

#### 7.6 Deployment Steps
- [ ] Database migrations
- [ ] Backend API deployment
- [ ] Frontend build and deployment
- [ ] API documentation deployment
- [ ] Monitoring and logging setup

---

## Database Schema Additions

### blog_ai_authors Table
```sql
CREATE TABLE blog_ai_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT UNIQUE NOT NULL,  -- 'claude-ai', 'gpt-4', etc
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  api_token_hash TEXT NOT NULL,
  rate_limit INT DEFAULT 10,
  requires_approval BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### blog_post_revisions Table
```sql
CREATE TABLE blog_post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  status TEXT,
  changed_by UUID,
  change_summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_post_revisions_post_id ON blog_post_revisions(post_id);
```

### blog_post_schedules Table
```sql
CREATE TABLE blog_post_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID UNIQUE NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMP NOT NULL,
  published_at TIMESTAMP,
  status TEXT DEFAULT 'pending',  -- 'pending', 'published', 'failed'
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_post_schedules_scheduled_for ON blog_post_schedules(scheduled_for);
```

---

## API Response Examples

### Create AI Post Response (Success)
```json
{
  "id": "post-uuid",
  "slug": "your-post-slug",
  "url": "https://yourdomain.com/blog/your-post-slug",
  "status": "draft",
  "message": "Post created successfully. Awaiting admin approval.",
  "createdAt": "2025-10-22T10:30:00Z"
}
```

### Validation Error Response
```json
{
  "error": "Validation failed",
  "errors": [
    {"field": "slug", "message": "Slug already exists"},
    {"field": "title", "message": "Title is required"}
  ]
}
```

### Rate Limit Error Response
```json
{
  "error": "Rate limit exceeded",
  "message": "Agent has reached daily post limit (10)",
  "remainingQuota": 0,
  "resetAt": "2025-10-23T00:00:00Z"
}
```

---

## Success Metrics
- Manual post creation time: < 10 minutes
- Auto-save reliability: 99.9%
- AI post creation success rate: 95%+
- Editor performance: < 100ms input latency
- Test coverage: > 80%
- Zero data loss on conflicts

---

## Timeline

| Phase | Description | Estimated Duration |
|-------|-------------|--------------------|
| 1 | Core Editor Components | Week 1-2 (40 hours) |
| 2 | Hooks & State Management | Week 2-3 (20 hours) |
| 3 | Editor Integration | Week 3 (25 hours) |
| 4 | Backend API | Week 4 (30 hours) |
| 5 | AI Integration | Week 5 (35 hours) |
| 6 | Testing & QA | Week 5-6 (30 hours) |
| 7 | Docs & Deployment | Week 6 (15 hours) |

**Total: ~6 weeks for full implementation (195 total hours)**

---

## Risks & Mitigation

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| Race conditions on save | Data loss or conflicts | Implement conflict resolution with last-write-wins or merge strategy; use optimistic locking |
| Large content performance | Editor slowdown | Lazy-load editor, virtualize media library, use worker threads for markdown parsing |
| AI content quality issues | Poor user experience | Implement approval workflow and content validation; set quality thresholds |
| Slug collisions | Duplicate URLs | Use UUID fallback if slug unavailable; implement collision detection API |
| Storage limits | Upload failures | Add media cleanup (delete unused assets after 30 days); implement storage quotas |
| Scheduling failures | Posts not published | Implement retry logic with exponential backoff; add monitoring and alerts |
| Concurrent edits | Editing conflicts | Show conflict warning; implement merge or take-latest strategy |

---

## Future Enhancements (Phase 2+)

- [ ] Collaborative editing (real-time multi-user)
- [ ] Advanced revision history with visual diff
- [ ] AI-powered content suggestions
- [ ] Content templates
- [ ] Bulk publishing
- [ ] Advanced analytics for blog posts
- [ ] Comment moderation system
- [ ] Social media integration (auto-share)
- [ ] SEO optimization insights
- [ ] A/B testing for headlines

---

## File Structure

Expected new files to be created:

```
src/
├── components/
│   └── blog-editor/
│       ├── TipTapEditor.tsx
│       ├── BlogPostForm.tsx
│       ├── CategoryTagSelector.tsx
│       ├── MediaInsertionWidget.tsx
│       ├── AutoSaveIndicator.tsx
│       └── __tests__/
│           ├── TipTapEditor.test.tsx
│           ├── BlogPostForm.test.tsx
│           └── ...
├── hooks/
│   └── blog/
│       ├── usePostEditor.ts
│       ├── useMediaLibrary.ts
│       ├── useSlugGeneration.ts
│       └── usePostAutoSave.ts
└── pages/
    └── BlogEditor.tsx (updated)

server/
├── src/
│   ├── routes/
│   │   └── v1/blog-editor.ts (new)
│   ├── services/
│   │   └── blog-editor-service.ts (new)
│   ├── middleware/
│   │   └── ai-blog-auth.ts (new)
│   └── utils/
│       └── slug-generator.ts (new)
└── tests/
    └── blog-editor.test.ts (new)

docs/
├── ai-blog-integration.md (new)
├── blog-editor-guide.md (new)
└── ai-agent-sdk/ (new)
    ├── python-client.py
    └── node-client.js

supabase/
└── migrations/
    ├── create_blog_ai_authors.sql (new)
    ├── create_blog_post_revisions.sql (new)
    └── create_blog_post_schedules.sql (new)
```

---

## Notes

- All TipTap extensions should support markdown input/output for consistency
- Auto-save should be throttled to prevent excessive API calls
- AI content validation should be strict to maintain quality
- Rate limiting should be per-agent, not per-user, to prevent abuse
- Consider implementing a content moderation queue for AI posts
- All API endpoints should include proper error handling and logging
- Use Supabase RLS for security instead of relying solely on backend validation

---

**Document created**: 2025-10-22
**Status**: Plan Approved - Ready for Implementation
