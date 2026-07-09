import * as React from 'react';

import { FormControl, FormItem, FormMessage } from '@/components/Form/Form';

import { Input, inputProps } from './Input';

export const FormInput: React.FC<inputProps> = ({
  variant = 'default',
  label,
  ...props
}) => {
  return (
    <FormItem>
      <FormControl>
        <Input variant={variant} label={label} {...props} />
      </FormControl>
      <FormMessage className="ml-1 w-fit text-xs" />
    </FormItem>
  );
};

FormInput.displayName = 'FormInput';
