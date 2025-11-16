/**
 * Map Uploader Component
 *
 * Image upload component for scene background images with:
 * - Drag-and-drop area
 * - File picker
 * - Image preview
 * - Grid alignment tool
 * - Scale and offset controls
 * - Rotation control
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, RotateCw, Grid, Move, ZoomIn, ZoomOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/use-toast';
import { uploadFile, buildTimestampedFilename } from '@/infrastructure/storage/supabase-storage';
import { cn } from '@/lib/utils';

interface MapUploaderProps {
  campaignId: string;
  width: number;
  height: number;
  gridSize: number;
  onImageUpload?: (imageUrl: string, thumbnailUrl?: string) => void;
  defaultImageUrl?: string;
}

const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const MapUploader: React.FC<MapUploaderProps> = ({
  campaignId,
  width,
  height,
  gridSize,
  onImageUpload,
  defaultImageUrl,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultImageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Image adjustment controls
  const [scale, setScale] = useState([100]);
  const [offsetX, setOffsetX] = useState([0]);
  const [offsetY, setOffsetY] = useState([0]);
  const [rotation, setRotation] = useState(0);
  const [showGrid, setShowGrid] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (file: File): boolean => {
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      toast({
        title: 'Invalid File Type',
        description: 'Please upload a PNG, JPG, or WebP image.',
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 10MB.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (!validateFile(file)) {
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast({
      title: 'Image Loaded',
      description: 'Adjust the image using the controls below, then click Upload.',
    });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleUpload = async () => {
    if (!imageFile) {
      toast({
        title: 'No Image Selected',
        description: 'Please select an image to upload.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload to storage bucket
      const filename = buildTimestampedFilename('scene-map', imageFile.name.split('.').pop() || 'png');
      const path = `campaigns/${campaignId}/scenes/${filename}`;

      const result = await uploadFile('campaign-assets', path, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      });

      // Build public URL
      const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/campaign-assets/${result.path}`;

      toast({
        title: 'Upload Successful',
        description: 'Your scene background has been uploaded.',
      });

      onImageUpload?.(publicUrl, publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload image.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setImageFile(null);
    setScale([100]);
    setOffsetX([0]);
    setOffsetY([0]);
    setRotation(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="space-y-6">
      {/* Drag and Drop Area */}
      {!previewUrl && (
        <Card
          variant="parchment"
          className={cn(
            'border-2 border-dashed cursor-pointer transition-all',
            isDragging && 'border-electricCyan bg-electricCyan/10',
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="mb-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Upload Scene Background</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag and drop your map image here, or click to browse
            </p>
            <Button variant="cosmic">
              <Upload className="mr-2 h-4 w-4" />
              Choose File
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: PNG, JPG, WebP (Max 10MB)
            </p>
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_FORMATS.join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Image Preview and Controls */}
      {previewUrl && (
        <div className="space-y-6">
          {/* Preview */}
          <Card variant="parchment">
            <CardContent className="p-4">
              <div className="relative bg-slate-100 rounded-lg overflow-hidden" style={{ aspectRatio: `${width}/${height}` }}>
                {/* Background Image */}
                <img
                  src={previewUrl}
                  alt="Map preview"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{
                    transform: `scale(${scale[0] / 100}) translate(${offsetX[0]}px, ${offsetY[0]}px) rotate(${rotation}deg)`,
                    transformOrigin: 'center',
                  }}
                />

                {/* Grid Overlay */}
                {showGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(0deg, transparent, transparent ${100 / height}%, rgba(0,0,0,0.2) ${100 / height}%, rgba(0,0,0,0.2) ${100 / height + 0.1}%),
                        repeating-linear-gradient(90deg, transparent, transparent ${100 / width}%, rgba(0,0,0,0.2) ${100 / width}%, rgba(0,0,0,0.2) ${100 / width + 0.1}%)
                      `,
                    }}
                  />
                )}
              </div>

              {/* Preview Info */}
              <div className="mt-4 text-sm text-muted-foreground text-center">
                Preview: {width} × {height} squares ({width * gridSize} × {height * gridSize} ft)
              </div>
            </CardContent>
          </Card>

          {/* Adjustment Controls */}
          <Card variant="parchment">
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">Image Adjustments</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGrid(!showGrid)}
                  >
                    <Grid className="mr-2 h-4 w-4" />
                    {showGrid ? 'Hide Grid' : 'Show Grid'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotate}
                  >
                    <RotateCw className="mr-2 h-4 w-4" />
                    Rotate
                  </Button>
                </div>
              </div>

              {/* Scale */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <ZoomIn className="h-4 w-4" />
                    Scale
                  </Label>
                  <span className="text-sm text-muted-foreground">{scale[0]}%</span>
                </div>
                <Slider
                  value={scale}
                  onValueChange={setScale}
                  min={10}
                  max={200}
                  step={1}
                />
              </div>

              {/* Offset X */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Move className="h-4 w-4" />
                    Horizontal Offset
                  </Label>
                  <span className="text-sm text-muted-foreground">{offsetX[0]}px</span>
                </div>
                <Slider
                  value={offsetX}
                  onValueChange={setOffsetX}
                  min={-500}
                  max={500}
                  step={1}
                />
              </div>

              {/* Offset Y */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Move className="h-4 w-4" />
                    Vertical Offset
                  </Label>
                  <span className="text-sm text-muted-foreground">{offsetY[0]}px</span>
                </div>
                <Slider
                  value={offsetY}
                  onValueChange={setOffsetY}
                  min={-500}
                  max={500}
                  step={1}
                />
              </div>

              {/* Rotation Display */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Rotation:</span>
                  <span className="text-muted-foreground">{rotation}°</span>
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setScale([100]);
                  setOffsetX([0]);
                  setOffsetY([0]);
                  setRotation(0);
                }}
              >
                Reset Adjustments
              </Button>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={isUploading}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button
              variant="cosmic"
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1"
            >
              {isUploading ? (
                'Uploading...'
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
