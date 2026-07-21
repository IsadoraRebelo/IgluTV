import { cn } from '@/utils';

export function pillLinkClass(isActive: boolean, isOverlay: boolean) {
  return cn(
    'rounded-full px-4.5 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-accent text-background'
      : isOverlay
        ? 'text-white/80 hover:text-white'
        : 'text-text-tertiary hover:text-foreground'
  );
}
