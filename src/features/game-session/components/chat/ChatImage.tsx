import { X } from 'lucide-react';
import React from 'react';

import { Dialog, DialogTrigger, DialogContent, DialogClose } from '@/components/ui/dialog';

type Props = {
  url: string;
  alt?: string;
  className?: string;
};

/**
 * ChatImage
 * Thumbnail (about 1/4 width) that opens a fullscreen lightbox on click.
 */
export const ChatImage: React.FC<Props> = ({ url, alt = 'Scene image', className }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <img
          src={url}
          alt={alt}
          loading="lazy"
          className={[
            'mx-auto w-1/4 min-w-[200px] max-w-[320px] h-auto object-contain rounded-md shadow-md border border-white/20 cursor-zoom-in',
            className || '',
          ].join(' ')}
        />
      </DialogTrigger>
      <DialogContent className="p-0 bg-transparent border-0 shadow-none w-[96vw] max-w-[96vw] max-h-[96vh]">
        {/* Centering wrapper to avoid layout shift when close button is present */}
        <div className="relative mx-auto max-w-[95vw] max-h-[90vh]">
          <img
            src={url}
            alt={alt}
            className="mx-auto max-w-full max-h-[90vh] object-contain rounded-md"
          />
          {/* Prominent close button */}
          <DialogClose className="absolute -top-3 -right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white shadow-lg hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/60">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatImage;
