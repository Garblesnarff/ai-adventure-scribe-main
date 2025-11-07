# Blog Post Editor

A comprehensive blog post editor component with markdown editing, media management, scheduling, and SEO controls.

## Features

### Core Functionality
- **Rich Form Management**: Full validation with Zod schema and React Hook Form
- **Markdown Editing**: Live preview with syntax highlighting toolbar
- **Media Library**: Upload, manage, and select images with automatic WebP conversion
- **Auto-generation**: Smart excerpt and SEO metadata generation from content
- **Scheduling**: Support for draft, scheduled, and published states
- **Categories & Tags**: Multi-select taxonomy management
- **SEO Controls**: Dedicated fields for SEO title and description with character limits

### User Experience
- **Auto-save Detection**: Warns users about unsaved changes
- **Slug Generation**: Automatic URL-friendly slug generation from title
- **Preview Mode**: Preview post before publishing
- **Responsive Layout**: Optimized for desktop and mobile editing
- **Validation Feedback**: Inline error messages and field-level validation

### Media Management
- **Upload**: Multi-file upload with drag-and-drop support
- **Optimization**: Automatic image compression and WebP conversion
- **Organization**: Visual grid layout with search and filtering
- **Selection**: Quick image selection for featured images

## Components

### BlogPostEditor
Main editor component that orchestrates the entire editing experience.

```tsx
import { BlogPostEditor } from '@/components/blog-admin/blog-post-editor';

function MyBlogAdmin() {
  return (
    <BlogPostEditor
      post={existingPost} // Optional: for edit mode
      onSuccess={(post) => console.log('Saved:', post)}
      onCancel={() => history.back()}
    />
  );
}
```

**Props:**
- `post?: BlogPost` - Existing post data for edit mode
- `onSuccess?: (post: BlogPost) => void` - Callback after successful save
- `onCancel?: () => void` - Callback when user cancels editing

### MarkdownEditor
Tabbed markdown editor with live preview.

```tsx
import { MarkdownEditor } from '@/components/blog-admin/blog-post-editor';

<MarkdownEditor
  value={content}
  onChange={setContent}
  placeholder="Write your post..."
  minHeight="400px"
/>
```

**Features:**
- Write/Preview tabs
- Markdown toolbar with common formatting options
- Character and word count
- Syntax highlighting in preview

### MediaManager
Dialog for managing blog media assets.

```tsx
import { MediaManager } from '@/components/blog-admin/blog-post-editor';

<MediaManager
  open={isOpen}
  onOpenChange={setIsOpen}
  onSelectMedia={(url) => setImageUrl(url)}
  currentMediaUrl={currentImage}
/>
```

**Features:**
- Grid view of uploaded media
- Multi-file upload
- Delete with confirmation
- Image preview
- URL copying

### MultiSelect
Multi-select dropdown for categories and tags.

```tsx
import { MultiSelect } from '@/components/blog-admin/blog-post-editor';

<MultiSelect
  options={[
    { value: '1', label: 'Category 1' },
    { value: '2', label: 'Category 2' },
  ]}
  value={selected}
  onChange={setSelected}
  placeholder="Select items..."
/>
```

## Validation Schema

The editor uses a Zod schema for form validation:

```typescript
{
  title: string (1-200 chars, required)
  slug: string (lowercase-with-hyphens, required)
  excerpt: string (max 500 chars, optional)
  content: string (required)
  coverImageUrl: string (valid URL or empty, optional)
  status: 'draft' | 'scheduled' | 'published'
  scheduledFor: string (ISO date, optional)
  categoryIds: string[] (optional)
  tagIds: string[] (optional)
  seoTitle: string (max 60 chars, optional)
  seoDescription: string (max 160 chars, optional)
  allowComments: boolean (default: true)
}
```

## Hooks Used

- `useForm` - React Hook Form for form state management
- `useBlogCategories` - Fetch available categories
- `useBlogTags` - Fetch available tags
- `useCreateBlogPost` - Create new blog post
- `useUpdateBlogPost` - Update existing blog post
- `useBlogMedia` - List media assets
- `useUploadBlogMedia` - Upload media files
- `useDeleteBlogMedia` - Delete media files

## Utilities

### Slug Generation
```typescript
import { slugify } from '@/utils/slug';

slugify('Hello World!'); // 'hello-world'
```

### Excerpt Generation
```typescript
import { generateExcerpt } from '@/utils/text-helpers';

generateExcerpt(markdownContent, 200); // Returns clean text excerpt
```

### Image Optimization
```typescript
import { compressImage, convertToWebP } from '@/utils/image-compression';

const webpBlob = await convertToWebP(file);
const compressed = await compressImage(file, 1, 1920);
```

## Testing

Unit tests are located in `__tests__/` directory:

- `blog-post-editor.test.tsx` - Component integration tests
- `form-validation.test.ts` - Schema validation and slug generation tests

Run tests:
```bash
npx vitest run src/components/blog-admin/blog-post-editor
```

## Accessibility

- Semantic HTML with proper heading hierarchy
- ARIA labels for form controls
- Keyboard navigation support
- Focus management in dialogs
- Screen reader friendly error messages

## Future Enhancements

- [ ] AI-assisted content generation hooks
- [ ] Collaborative editing with version history
- [ ] Image editing within media manager
- [ ] Bulk media operations
- [ ] Custom markdown components
- [ ] Autosave drafts to local storage
- [ ] Rich text editor alternative to markdown

## Integration Points

### Backend Endpoints
- `POST /v1/blog/posts` - Create post
- `PUT /v1/blog/posts/:id` - Update post
- `POST /v1/blog/media/sign-upload` - Get signed upload URL
- `GET /v1/blog/preview` - Preview endpoint (to be implemented)

### Database Tables
- `blog_posts` - Post storage
- `blog_categories` - Category taxonomy
- `blog_tags` - Tag taxonomy
- Storage: `blog-media` bucket in Supabase

## Dependencies

- `react-hook-form` - Form state management
- `zod` - Schema validation
- `@hookform/resolvers` - Zod integration
- `marked` - Markdown parsing
- `sanitize-html` - XSS protection
- `date-fns` - Date formatting
- `sonner` - Toast notifications
