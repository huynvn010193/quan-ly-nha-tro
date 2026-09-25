import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors [&>svg]:size-3 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-white',
        secondary: 'border-transparent bg-slate-100 text-slate-700',
        outline: 'border-slate-200 bg-transparent text-slate-700',
        success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
        info: 'border-blue-100 bg-blue-50 text-blue-700',
        warning: 'border-amber-100 bg-amber-50 text-amber-700',
        destructive: 'border-rose-100 bg-rose-50 text-rose-700'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot='badge' className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
