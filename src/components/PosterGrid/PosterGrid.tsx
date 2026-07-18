import type { ReactNode } from 'react';

import { cn } from '@/utils';

export function PosterGrid({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return <div className={cn('grid', className)}>{children}</div>;
}
