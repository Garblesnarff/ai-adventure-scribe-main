import * as React from 'react';
import { toast as sonnerToast } from 'sonner';

type CompatToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: 'default' | 'destructive';
};

// Sonner-backed toast function compatible with existing call sites
function toast(opts: CompatToastOptions) {
  const { title, description, variant } = opts || {};

  let id: string | number;
  if (variant === 'destructive') {
    id = sonnerToast.error(description || title || '');
  } else if (title && description) {
    id = sonnerToast(String(title), { description: String(description) });
  } else {
    id = sonnerToast(String(description || title || ''));
  }

  return {
    id: String(id),
    dismiss: () => sonnerToast.dismiss(id),
    update: (_next: CompatToastOptions) => {
      // no-op for now; can be wired to sonner's custom update if needed
    },
  };
}

function useToast() {
  // Keep hook signature; most callers only use { toast }
  const memoToast = React.useMemo(() => toast, []);
  const dismiss = React.useCallback((toastId?: string) => {
    if (toastId) sonnerToast.dismiss(toastId);
    else sonnerToast.dismiss();
  }, []);

  return {
    toasts: [] as any[],
    toast: memoToast,
    dismiss,
  };
}

export { useToast, toast };
