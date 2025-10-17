import type { SiteConfig } from '../../config/site.js';
import type { BlogPost } from '../../services/blog-service.js';

export function createSoftwareApplicationSchema(site: SiteConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.softwareApplication.name,
    applicationCategory: site.softwareApplication.applicationCategory,
    operatingSystem: site.softwareApplication.operatingSystem,
    offers: {
      '@type': 'Offer',
      price: site.softwareApplication.offers.price,
      priceCurrency: site.softwareApplication.offers.priceCurrency,
    },
    url: site.url,
    description: site.description,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: site.logoUrl,
      },
    },
  };
}

export function createBlogSchema(site: SiteConfig, canonicalUrl: string, posts: BlogPost[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${site.name} Blog`,
    headline: `${site.name} Blog`,
    description: site.description,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: site.logoUrl,
      },
    },
    blogPost: posts.slice(0, 12).map((post) => ({
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${site.url}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
      description: post.excerpt,
    })),
  };
}

export function createArticleSchema(site: SiteConfig, canonicalUrl: string, post: BlogPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    url: canonicalUrl,
    image: post.coverImageUrl ? [post.coverImageUrl] : [site.defaultSocialImageUrl],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    wordCount: Math.round(post.readingTimeMinutes * 200),
    author: {
      '@type': 'Person',
      name: post.authorName || site.name,
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: site.logoUrl,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    keywords: post.tags.length ? post.tags : undefined,
  };
}
