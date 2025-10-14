import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface GalleryItem {
  url: string;
  name?: string;
  createdAt?: string;
  label?: string;
}

interface GalleryGridProps {
  title?: string;
  images: GalleryItem[];
  emptyMessage?: string;
}

const GalleryGrid: React.FC<GalleryGridProps> = ({ title, images, emptyMessage }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<GalleryItem | null>(null);

  if (!images || images.length === 0) {
    return (
      <div className="w-full">
        {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
        <div className="text-sm text-muted-foreground border rounded p-6 text-center">
          {emptyMessage || 'No images yet.'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-3">{title}</h3>}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {images.map((img) => (
          <button
            key={img.url}
            className="relative group rounded overflow-hidden border bg-muted/30 hover:shadow-md"
            onClick={() => {
              setActive(img);
              setOpen(true);
            }}
          >
            <img src={img.url} alt={img.label || img.name || 'image'} className="w-full h-36 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{active?.label || active?.name || 'Preview'}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="w-full">
              <img src={active.url} alt={active.label || active.name || 'image'} className="w-full h-auto object-contain rounded" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryGrid;
