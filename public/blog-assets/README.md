# Blog Assets Directory

This directory contains all assets used in blog posts, organized for scalability and maintainability.

## Directory Structure

```
blog-assets/
├── images/                    # All image assets
│   ├── posts/                # Post-specific images
│   │   ├── 2025/             # Year-based organization
│   │   │   ├── 01-january/   # Month-based for ~30 posts
│   │   │   │   ├── post-slug/
│   │   │   │   │   ├── featured.jpg
│   │   │   │   │   ├── diagram-1.png
│   │   │   │   │   └── screenshots/
│   │   │   │   └── another-post/
│   │   │   └── 02-february/  # Next month's posts
│   │   └── shared/           # Reusable images
│   ├── authors/              # Author profile pictures
│   └── ui/                   # Blog UI elements
└── documents/                # PDFs, guides, etc.
    ├── guides/
    ├── templates/
    └── resources/
```

## Usage Guidelines

### For Daily Posts
- Create one folder per post using the post slug as folder name
- Use descriptive filenames: `post-slug-description-type.ext`
- Store featured images directly in the post folder
- Use subfolders for screenshots, diagrams, etc.

### Asset Types
- **featured.jpg** - Main post hero image (1200x600 recommended)
- **diagrams/** - Process flows, architecture diagrams
- **screenshots/** - UI screenshots, gameplay captures
- **thumbnails/** - Smaller versions for previews

### Naming Conventions
- Use kebab-case for filenames: `character-creation-process.png`
- Include descriptive text: `before-after-comparison.png`
- Avoid generic names: `image1.png` → `welcome-hero-banner.png`

## Integration

Assets are automatically served from the `/blog-assets/` path and work with:
- Frontend blog components
- Supabase storage for uploaded assets
- CDN integration for performance

## Maintenance

- Review and archive assets older than 1 year
- Remove unused assets after 6 months
- Optimize images for web delivery
- Use consistent image sizes across posts
