import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { BlogPostStatus } from '@/types/blog';

const STATUS_VARIANTS: Record<BlogPostStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'outline' },
  published: { label: 'Published', variant: 'default' },
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
