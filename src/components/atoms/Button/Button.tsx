import { forwardRef } from 'react';

import { cn } from '@/utils';

const buttonVariants = {
  variant: {
    default: 'bg-background text-foreground hover:bg-background/95 p-2.5',
    primary:
      'bg-primary-foreground text-foreground hover:bg-primary-foreground/95 border-muted border p-2.5',
    ghost: 'bg-transparent text-foreground tracking-wide p-2.5',
  },
  size: {
    default: 'text-base',
    sm: 'text-sm',
  },
} as const;

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        data-testid="button"
        className={cn(
          'inline-block w-fit max-w-full overflow-hidden rounded-md border-none tracking-wide text-ellipsis whitespace-nowrap transition-colors',
          'disabled:pointer-events-none disabled:opacity-50',
          buttonVariants.variant[variant],
          buttonVariants.size[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
