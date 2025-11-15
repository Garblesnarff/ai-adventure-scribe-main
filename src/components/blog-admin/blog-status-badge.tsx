import React from 'react';

import type { BlogPostStatus } from '@/types/blog';

import { Badge } from '@/components/ui/badge';

const STATUS_VARIANTS: Record<
  BlogPostStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  review: { label: 'In Review', variant: 'outline' },
  scheduled: { label: 'Scheduled', variant: 'outline' },
  published: { label: 'Published', variant: 'default' },
  archived: { label: 'Archived', variant: 'destructive' },
};

interface BlogStatusBadgeProps {
  status: BlogPostStatus;
}

export const BlogStatusBadge: React.FC<BlogStatusBadgeProps> = ({ status }) => {
  const config = STATUS_VARIANTS[status] || STATUS_VARIANTS.draft;
  return (
    <Badge variant={config.variant} className="capitalize">
      {config.label}
    </Badge>
  );
};
