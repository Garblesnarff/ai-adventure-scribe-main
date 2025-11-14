import React, { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Z_INDEX } from '@/constants/z-index';

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
      {title && (
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <span className="w-1 h-6 bg-gradient-to-b from-infinite-purple to-infinite-gold rounded-full"></span>
          {title}
        </h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((img, index) => (
          <div
            key={img.name || `${img.url}-${index}`}
            className="relative group cursor-pointer"
            onClick={() => {
              setActive(img);
              setOpen(true);
            }}
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 aspect-[4/3]">
              <img
                src={img.url}
                alt={img.label || img.name || 'image'}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-infinite-purple/20 to-infinite-gold/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />

              {/* Floating Label */}
              {img.label && (
                <div className="absolute bottom-3 left-3 right-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                  <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2">
                    <p className="text-white text-sm font-medium">{img.label}</p>
                  </div>
                </div>
              )}

              {/* Decorative Corner Elements */}
              <div className="absolute top-2 right-2 w-2 h-2 bg-infinite-gold/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="absolute bottom-2 left-2 w-1 h-1 bg-white/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100"></div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 border-infinite-purple/30">
          <DialogHeader className={`relative z-[${Z_INDEX.DROPDOWN}] pb-4`}>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-infinite-gold to-infinite-purple bg-clip-text text-transparent">
              {active?.label || active?.name || 'Gallery Preview'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {active?.label || active?.name
                ? `Previewing ${active?.label || active?.name}`
                : 'Preview of selected gallery image.'}
            </DialogDescription>
          </DialogHeader>
          {active && (
            <div className="relative w-full max-h-[70vh] overflow-hidden rounded-lg">
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-infinite-purple/20 via-transparent to-infinite-gold/20 blur-3xl scale-110"></div>

              <img
                src={active.url}
                alt={active.label || active?.name || 'image'}
                className="relative w-full h-auto object-contain rounded-lg shadow-2xl border border-white/10"
              />

              {/* Decorative elements */}
              <div className="absolute top-4 right-4 w-3 h-3 bg-infinite-gold/60 rounded-full animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-2 h-2 bg-white/40 rounded-full animate-pulse delay-500"></div>
              <div className="absolute top-1/2 left-2 w-1 h-1 bg-infinite-teal/50 rounded-full animate-pulse delay-1000"></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GalleryGrid;
