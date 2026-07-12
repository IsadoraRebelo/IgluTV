'use client';

import { ChevronDown } from 'lucide-react';
import { type ReactNode, useState } from 'react';

export function AccordionSection({
  title,
  defaultExpanded = false,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="mb-3 overflow-hidden rounded-lg bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left"
      >
        <span className="text-base font-semibold text-white">{title}</span>
        <ChevronDown
          className={`h-6 w-6 shrink-0 text-[#678] transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''
            }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
      >
        <div className="overflow-hidden">
          <div className="bg-accent h-1 w-full" />
          <div className="flex flex-col gap-2 p-2">{children}</div>
        </div>
      </div>
    </div>
  );
}
