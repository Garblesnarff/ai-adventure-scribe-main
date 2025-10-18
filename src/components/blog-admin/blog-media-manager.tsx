import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Image as ImageIcon } from 'lucide-react';

export const BlogMediaManager: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Media Library</CardTitle>
        <CardDescription>Upload and manage images for your blog posts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-sm text-muted-foreground mb-4">
            Media management coming soon
          </p>
          <Button disabled variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload Media
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
