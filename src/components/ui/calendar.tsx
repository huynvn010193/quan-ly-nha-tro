'use client';

import * as React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';

function Calendar({ className, classNames, showOutsideDays = true, ...props }: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        root: 'relative w-fit',
        months: 'flex flex-col',
        month: 'space-y-3',
        month_caption: 'relative flex h-9 items-center justify-center px-10',
        caption_label: 'pointer-events-none flex w-full items-center justify-between gap-2 text-xs font-bold text-slate-800 [&>svg]:ml-auto',
        dropdowns: 'relative z-20 flex items-center justify-center gap-2',
        dropdown_root:
          'relative min-w-22 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 first:min-w-28',
        dropdown: 'absolute inset-0 cursor-pointer opacity-0',
        nav: 'pointer-events-none absolute inset-x-3 top-3 z-30 flex items-center justify-between',
        button_previous:
          'pointer-events-auto grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-30',
        button_next:
          'pointer-events-auto grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-30',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 py-1 text-center text-[10px] font-semibold text-slate-400',
        weeks: 'block',
        week: 'mt-1 flex w-full',
        day: 'relative size-9 p-0 text-center text-sm [&:has([aria-selected])]:rounded-lg',
        day_button:
          'grid size-9 place-items-center rounded-lg text-xs font-medium text-slate-600 outline-none transition hover:bg-emerald-50 hover:text-emerald-800 focus-visible:ring-4 focus-visible:ring-emerald-500/15',
        selected: '[&>button]:bg-emerald-700 [&>button]:font-bold [&>button]:text-white [&>button]:hover:bg-emerald-700 [&>button]:hover:text-white',
        today: '[&>button]:border [&>button]:border-emerald-300 [&>button]:font-bold [&>button]:text-emerald-700',
        outside: '[&>button]:text-slate-300',
        disabled: '[&>button]:pointer-events-none [&>button]:opacity-30',
        hidden: 'invisible',
        ...classNames
      }}
      components={{
        Chevron: ({ className: chevronClassName, orientation }) => {
          const iconClassName = cn('size-4', chevronClassName);
          if (orientation === 'left') return <ChevronLeft className={iconClassName} />;
          if (orientation === 'right') return <ChevronRight className={iconClassName} />;
          if (orientation === 'up') return <ChevronUp className={iconClassName} />;
          return <ChevronDown className={iconClassName} />;
        }
      }}
      {...props}
    />
  );
}

export { Calendar };
