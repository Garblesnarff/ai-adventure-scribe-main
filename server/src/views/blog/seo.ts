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
  const blogPosts = posts.slice(0, 12).map((post) => {
    const keywords = [...(post.tags as any[]), ...(post.categories as any[])].map(String).filter(Boolean);

    return {
      '@type': 'BlogPosting',
      headline: post.title,
      url: `${site.url}/blog/${post.slug}`,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt ?? post.publishedAt,
      image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
      description: post.excerpt,
      author: {
        '@type': 'Person',
        name: post.authorName || site.name,
      },
      keywords: keywords.length ? keywords.join(', ') : undefined,
    };
  });
  const genres = Array.from(new Set(posts.flatMap((post) => (post.categories as any[]).map(String)))).filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${site.name} Blog`,
    headline: `${site.name} Blog`,
    description: site.description,
    genre: genres,
    inLanguage: 'en-US',
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: site.logoUrl,
      },
    },
    blogPost: blogPosts,
  };
}

export function createArticleSchema(site: SiteConfig, canonicalUrl: string, post: BlogPost) {
  const allKeywords = [...(post.tags as any[]), ...(post.categories as any[])].map(String).filter(Boolean);
  
  return {
    '@context': 'https://schema.org',
    '@type': ['Article', 'BlogPosting'],
    headline: post.title,
    alternativeHeadline: post.excerpt,
    description: post.excerpt,
    url: canonicalUrl,
    image: post.coverImageUrl ? [post.coverImageUrl] : [site.defaultSocialImageUrl],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt ?? post.publishedAt,
    wordCount: post.estimatedWordCount,
    timeRequired: `PT${post.readingTimeMinutes}M`,
    articleSection: post.categories.length ? post.categories[0] : undefined,
    articleBody: post.excerpt,
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
    keywords: allKeywords.length ? allKeywords.join(', ') : undefined,
    about: post.categories.map((category) => ({
      '@type': 'Thing',
      name: category,
    })),
  };
}
