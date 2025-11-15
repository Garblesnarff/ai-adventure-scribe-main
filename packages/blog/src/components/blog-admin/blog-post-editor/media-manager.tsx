import { Upload, Trash2, Image as ImageIcon, Loader2, ExternalLink } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

import { logger } from '../../../lib/logger';

import type { BlogMediaAsset } from '@/types/blog';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBlogMedia, useUploadBlogMedia, useDeleteBlogMedia } from '@/hooks/blog/useBlogMedia';
import { compressImage, convertToWebP } from '@/utils/image-compression';


interface MediaManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMedia: (url: string) => void;
  currentMediaUrl?: string;
}

export const MediaManager: React.FC<MediaManagerProps> = ({
  open,
  onOpenChange,
  onSelectMedia,
  currentMediaUrl,
}) => {
  const { data: mediaAssets = [], isLoading } = useBlogMedia();
  const uploadMutation = useUploadBlogMedia();
  const deleteMutation = useDeleteBlogMedia();
  
  const [selectedAsset, setSelectedAsset] = React.useState<BlogMediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<BlogMediaAsset | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      try {
        let processedFile: File | Blob = file;
        
        if (file.type === 'image/png' || file.type === 'image/jpeg') {
          try {
            processedFile = await convertToWebP(file);
          } catch (conversionError) {
            logger.warn('WebP conversion failed, compressing original:', conversionError);
            processedFile = await compressImage(file);
          }
        }

        const filename = file.name.replace(/\.[^.]+$/, '.webp');

        await uploadMutation.mutateAsync({
          file: processedFile,
          filename,
          contentType: processedFile instanceof File ? processedFile.type : 'image/webp',
        });
        
        toast.success(`Uploaded ${file.name}`);
      } catch (error: any) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (asset: BlogMediaAsset) => {
    try {
      await deleteMutation.mutateAsync({ path: asset.path, bucket: asset.bucket });
      toast.success('Media deleted successfully');
      setDeleteTarget(null);
      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(null);
      }
    } catch (error: any) {
      toast.error(`Failed to delete media: ${error.message}`);
    }
  };

  const handleSelectAsset = (asset: BlogMediaAsset) => {
    onSelectMedia(asset.publicUrl);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Media Library</DialogTitle>
            <DialogDescription>
              Upload and manage media files for your blog posts
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploadMutation.isPending}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button
                    variant="outline"
                    disabled={uploadMutation.isPending}
                    asChild
                  >
                    <span>
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Images
                        </>
                      )}
                    </span>
                  </Button>
                </Label>
                <p className="text-sm text-muted-foreground">
                  Images will be optimized and converted to WebP
                </p>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : mediaAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No media files yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Upload your first image to get started
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaAssets.map((asset) => (
                    <Card
                      key={asset.id}
                      className={`group cursor-pointer transition-all hover:shadow-lg ${
                        selectedAsset?.id === asset.id ? 'ring-2 ring-primary' : ''
                      } ${currentMediaUrl === asset.publicUrl ? 'ring-2 ring-green-500' : ''}`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <CardContent className="p-0">
                        <div className="relative aspect-square overflow-hidden rounded-t-lg">
                          <img
                            src={asset.publicUrl}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="icon"
                              variant="secondary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectAsset(asset);
                              }}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(asset);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs truncate font-medium">{asset.name}</p>
                          {asset.size && (
                            <p className="text-xs text-muted-foreground">
                              {(asset.size / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {selectedAsset && (
              <Button onClick={() => handleSelectAsset(selectedAsset)}>
                Select Image
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Media</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
