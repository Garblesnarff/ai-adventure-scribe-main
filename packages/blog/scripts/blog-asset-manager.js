#!/usr/bin/env node

/**
 * Blog Asset Manager
 * Utility script for organizing and managing blog assets
 * Run with: node scripts/blog-asset-manager.js [command]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');
const BLOG_ASSETS_DIR = path.join(PROJECT_ROOT, 'public/blog-assets');

class BlogAssetManager {
  constructor() {
    this.blogAssetsDir = BLOG_ASSETS_DIR;
  }

  /**
   * Create directory structure for a new month
   */
  createMonthStructure(year, month) {
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    const monthFolder = `${String(month).padStart(2, '0')}-${monthName}`;

    const monthPath = path.join(this.blogAssetsDir, 'images/posts', year.toString(), monthFolder);

    if (fs.existsSync(monthPath)) {
      console.log(`📁 Month folder already exists: ${monthPath}`);
      return monthPath;
    }

    fs.mkdirSync(monthPath, { recursive: true });
    console.log(`✅ Created month folder: ${monthPath}`);
    return monthPath;
  }

  /**
   * Create directory structure for a new post
   */
  createPostStructure(postSlug, year = new Date().getFullYear(), month = new Date().getMonth() + 1) {
    const monthPath = this.createMonthStructure(year, month);
    const postPath = path.join(monthPath, postSlug);

    if (fs.existsSync(postPath)) {
      console.log(`📁 Post folder already exists: ${postPath}`);
      return postPath;
    }

    fs.mkdirSync(postPath, { recursive: true });
    console.log(`✅ Created post folder: ${postPath}`);
    return postPath;
  }

  /**
   * Copy existing assets to new organized structure
   */
  migrateExistingAssets() {
    console.log('🔄 Migrating existing assets to new structure...');

    const existingImages = [
      { file: 'hero_header.png', post: 'welcome-to-infinite-realms' },
      { file: 'character-creation.png', post: 'building-better-ai-characters' },
      { file: 'adventure-tips.png', post: 'top-10-tips-for-new-players' },
      { file: 'world-building.png', post: 'art-of-world-building' }
    ];

    existingImages.forEach(({ file, post }) => {
      const sourcePath = path.join(PROJECT_ROOT, 'public', file);
      const postPath = this.createPostStructure(post);

      if (fs.existsSync(sourcePath)) {
        const destPath = path.join(postPath, file);
        try {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`✅ Copied ${file} to ${post} folder`);
        } catch (error) {
          console.log(`⚠️  Could not copy ${file}: ${error.message}`);
        }
      } else {
        console.log(`⚠️  Source file not found: ${sourcePath}`);
      }
    });
  }

  /**
   * Generate asset path for a post
   */
  generateAssetPath(postSlug, assetName, assetType = 'images') {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long' }).toLowerCase();

    return `blog-assets/${assetType}/posts/${year}/${month}-${monthName}/${postSlug}/${assetName}`;
  }

  /**
   * Create a README file in the blog assets directory
   */
  createReadme() {
    const readmePath = path.join(this.blogAssetsDir, 'README.md');
    const readmeContent = `# Blog Assets Directory

This directory contains all assets used in blog posts, organized for scalability and maintainability.

## Directory Structure

\`\`\`
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
\`\`\`

## Usage Guidelines

### For Daily Posts
- Create one folder per post using the post slug as folder name
- Use descriptive filenames: \`post-slug-description-type.ext\`
- Store featured images directly in the post folder
- Use subfolders for screenshots, diagrams, etc.

### Asset Types
- **featured.jpg** - Main post hero image (1200x600 recommended)
- **diagrams/** - Process flows, architecture diagrams
- **screenshots/** - UI screenshots, gameplay captures
- **thumbnails/** - Smaller versions for previews

### Naming Conventions
- Use kebab-case for filenames: \`character-creation-process.png\`
- Include descriptive text: \`before-after-comparison.png\`
- Avoid generic names: \`image1.png\` → \`welcome-hero-banner.png\`

## Integration

Assets are automatically served from the \`/blog-assets/\` path and work with:
- Frontend blog components
- Supabase storage for uploaded assets
- CDN integration for performance

## Maintenance

- Review and archive assets older than 1 year
- Remove unused assets after 6 months
- Optimize images for web delivery
- Use consistent image sizes across posts
`;

    fs.writeFileSync(readmePath, readmeContent);
    console.log(`✅ Created README: ${readmePath}`);
  }

  /**
   * List all assets for a specific post
   */
  listPostAssets(postSlug) {
    const searchPaths = [
      path.join(this.blogAssetsDir, 'images/posts', '**', postSlug),
      path.join(this.blogAssetsDir, 'documents', '**', postSlug)
    ];

    const assets = [];

    searchPaths.forEach(searchPath => {
      try {
        const files = fs.readdirSync(searchPath, { recursive: true });
        files.forEach(file => {
          if (typeof file === 'string') {
            assets.push(path.join(searchPath, file));
          }
        });
      } catch (error) {
        // Directory doesn't exist yet, skip
      }
    });

    return assets;
  }

  /**
   * Validate asset organization
   */
  validateOrganization() {
    console.log('🔍 Validating asset organization...');

    const issues = [];
    const warnings = [];

    // Check if main directories exist
    const requiredDirs = [
      'images/posts',
      'images/authors',
      'images/shared',
      'images/ui',
      'documents/guides',
      'documents/templates',
      'documents/resources'
    ];

    requiredDirs.forEach(dir => {
      const fullPath = path.join(this.blogAssetsDir, dir);
      if (!fs.existsSync(fullPath)) {
        issues.push(`Missing directory: ${dir}`);
      }
    });

    // Check for orphaned assets
    const allAssets = this.getAllAssets();
    const organizedAssets = allAssets.filter(asset =>
      asset.includes('/posts/') || asset.includes('/authors/') ||
      asset.includes('/shared/') || asset.includes('/ui/')
    );

    if (organizedAssets.length !== allAssets.length) {
      warnings.push('Some assets may not be properly organized');
    }

    return { issues, warnings };
  }

  /**
   * Get all assets in the blog directory
   */
  getAllAssets() {
    const assets = [];

    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);

      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          assets.push(fullPath);
        }
      });
    };

    if (fs.existsSync(this.blogAssetsDir)) {
      scanDirectory(this.blogAssetsDir);
    }

    return assets;
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log(`
📁 Blog Asset Manager

Usage: node scripts/blog-asset-manager.js [command]

Commands:
  setup           Create initial directory structure and README
  migrate         Move existing assets to organized structure
  validate        Check asset organization and report issues
  create-post     Create folder structure for a new post
  list-assets     List all assets for a specific post

Examples:
  node scripts/blog-asset-manager.js setup
  node scripts/blog-asset-manager.js create-post my-awesome-post
  node scripts/blog-asset-manager.js migrate
  node scripts/blog-asset-manager.js validate
`);
  }

  /**
   * Main command handler
   */
  async run() {
    const command = process.argv[2];

    switch (command) {
      case 'setup':
        this.createMonthStructure(new Date().getFullYear(), new Date().getMonth() + 1);
        this.createReadme();
        console.log('🎉 Blog assets setup complete!');
        break;

      case 'migrate':
        this.migrateExistingAssets();
        console.log('🔄 Asset migration complete!');
        break;

      case 'validate':
        const { issues, warnings } = this.validateOrganization();
        if (issues.length > 0) {
          console.log('❌ Issues found:');
          issues.forEach(issue => console.log(`   ${issue}`));
        }
        if (warnings.length > 0) {
          console.log('⚠️  Warnings:');
          warnings.forEach(warning => console.log(`   ${warning}`));
        }
        if (issues.length === 0 && warnings.length === 0) {
          console.log('✅ Asset organization looks good!');
        }
        break;

      case 'create-post':
        const postSlug = process.argv[3];
        if (!postSlug) {
          console.log('❌ Please provide a post slug');
          console.log('Example: node scripts/blog-asset-manager.js create-post my-awesome-post');
          break;
        }
        this.createPostStructure(postSlug);
        break;

      case 'list-assets':
        const listSlug = process.argv[3];
        if (!listSlug) {
          console.log('❌ Please provide a post slug');
          console.log('Example: node scripts/blog-asset-manager.js list-assets my-awesome-post');
          break;
        }
        const assets = this.listPostAssets(listSlug);
        if (assets.length === 0) {
          console.log(`📁 No assets found for post: ${listSlug}`);
        } else {
          console.log(`📁 Assets for ${listSlug}:`);
          assets.forEach(asset => console.log(`   ${path.relative(this.blogAssetsDir, asset)}`));
        }
        break;

      default:
        this.showHelp();
        break;
    }
  }
}

// Run the asset manager if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const manager = new BlogAssetManager();
  manager.run();
}

export default BlogAssetManager;
