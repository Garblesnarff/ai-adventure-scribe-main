/**
 * Shared Components Index
 *
 * Public API for all shared components across the application.
 * Organized by category for easy discovery.
 */

// UI Components (shadcn/ui)
export * from './ui/accordion';
export * from './ui/alert-dialog';
export * from './ui/alert';
export * from './ui/avatar';
export * from './ui/badge';
export * from './ui/button';
export * from './ui/calendar';
export * from './ui/card';
export * from './ui/checkbox';
export * from './ui/collapsible';
export * from './ui/command';
export * from './ui/dialog';
export * from './ui/dice-roller';
export * from './ui/dropdown-menu';
export * from './ui/enhancement-panel';
export * from './ui/form';
export * from './ui/input';
export * from './ui/label';
export * from './ui/option-selector';
export * from './ui/popover';
export * from './ui/progress';
export * from './ui/radio-group';
export * from './ui/scroll-area';
export * from './ui/select';
export * from './ui/separator';
export * from './ui/sheet';
export * from './ui/sidebar';
export * from './ui/skeleton';
export * from './ui/slider';
export * from './ui/sonner';
export * from './ui/switch';
export * from './ui/table';
export * from './ui/tabs';
export * from './ui/textarea';
export * from './ui/toaster';
export * from './ui/toast';
export * from './ui/toggle';
export * from './ui/tooltip';
export { useToast } from './ui/use-toast';

// Layout Components
export { Breadcrumbs } from './layout/breadcrumbs';
export { Navigation } from './layout/navigation';

// Error Components
export {
  ErrorBoundary,
  CampaignErrorFallback,
  CharacterCreationErrorFallback,
  GameErrorFallback,
  ErrorBoundaryTest,
} from './error';

// Skeleton Components (Loading States)
export { CharacterListSkeleton, CharacterSelectionSkeleton, TimelineSkeleton } from './skeletons';

// Other Shared Components
export { ProgressIndicator } from './ProgressIndicator';
