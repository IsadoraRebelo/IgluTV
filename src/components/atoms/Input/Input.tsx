import { forwardRef } from 'react';

import { cn } from '@/utils';

const inputVariants = {
  variant: {
    default: 'bg-primary-foreground text-foreground',
    secondary: 'bg-background text-foreground',
  },
} as const;

export interface inputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: keyof typeof inputVariants.variant;
  label?: string;
  description?: string;
}

export const Input = forwardRef<HTMLInputElement, inputProps>(
  ({ className, type, variant = 'default', label, id, ...props }, ref) => {
    return (
      <div>
        {label && (
          <label
            htmlFor={id}
            className="text-foreground mb-1 ml-1 block text-xs font-medium tracking-wider"
          >
            {label}
          </label>
        )}
        <input
          aria-label={label}
          type={type}
          id={id}
          className={cn(
            'placeholder:text-muted-foreground w-full rounded-md text-sm',
            'border-muted h-10 border px-3 py-2 leading-none',
            'focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            inputVariants.variant[variant],
            className
          )}
          ref={ref}
          suppressHydrationWarning
          {...props}
        />
        {props.description && (
          <div className="text-muted-foreground mt-2 ml-1 text-xs">
            {props.description}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
