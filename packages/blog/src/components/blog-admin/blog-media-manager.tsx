import { Upload, Image as ImageIcon, X, Plus, FolderOpen } from 'lucide-react';
import React, { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

import { logger } from '../../lib/logger';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useBlogMedia, useUploadBlogMedia } from '@/hooks/blog/useBlogMedia';



interface MediaFile extends File {
  preview?: string;
  uploadedUrl?: string;
}

export const BlogMediaManager: React.FC = () => {
  const { isBlogAdmin } = useAuth();
  const [uploadPath, setUploadPath] = useState('uploads');
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const { data: mediaAssets, isLoading, refetch } = useBlogMedia(uploadPath);
  const uploadMedia = useUploadBlogMedia(uploadPath);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !isBlogAdmin) return;

    for (const file of Array.from(files)) {
      const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
      setUploadingFiles(prev => new Set(prev).add(fileKey));

      try {
        await uploadMedia.mutateAsync({
          file,
          filename: `${uploadPath}/${file.name}`,
          contentType: file.type,
          prefix: uploadPath,
        });

        toast.success(`Uploaded ${file.name}`);
        refetch(); // Refresh media list
      } catch (error) {
        logger.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileKey);
          return newSet;
        });
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [isBlogAdmin, uploadMedia, uploadPath, refetch]);

  if (!isBlogAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Media Library</CardTitle>
          <CardDescription>Upload and manage images for your blog posts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <p className="text-sm text-destructive">
              Blog admin privileges are required to manage media.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Media</CardTitle>
          <CardDescription>
            Upload images for your blog posts. Supported formats: JPEG, PNG, GIF, WebP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="upload-path">Upload Path</Label>
              <Input
                id="upload-path"
                value={uploadPath}
                onChange={(e) => setUploadPath(e.target.value)}
                placeholder="uploads/post-slug/"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Relative path where files will be stored (e.g., "uploads/post-slug/screenshots/")
              </p>
            </div>

            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="media-upload"
              />
              <label htmlFor="media-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div>
                  <p className="text-sm font-medium">
                    Click to select images, or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum file size: 10MB per image
                  </p>
                </div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Media Library</CardTitle>
              <CardDescription>
                {mediaAssets?.length || 0} assets in /{uploadPath}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : mediaAssets && mediaAssets.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mediaAssets.map((asset) => (
                <div key={asset.id} className="group relative aspect-square">
                  <img
                    src={asset.publicUrl}
                    alt={asset.name}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <div className="text-white text-center p-2">
                      <p className="text-xs font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-gray-300">
                        {(asset.size ? asset.size / 1024 / 1024 : 0).toFixed(1)}MB
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(asset.publicUrl);
                          toast.success('URL copied to clipboard');
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No media assets found in /{uploadPath}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload some images to get started
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uploading Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(uploadingFiles).map((fileKey) => (
                <div key={fileKey} className="flex items-center gap-2 text-sm">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  <span>Uploading...</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
