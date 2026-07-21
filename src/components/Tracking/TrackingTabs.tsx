'use client';

import { LayoutGrid } from 'lucide-react';
import { useState } from 'react';

type TabId = 'toWatch' | 'upcoming';

const TABS: { id: TabId; label: string }[] = [
  { id: 'toWatch', label: 'To Watch' },
  { id: 'upcoming', label: 'Upcoming' },
];

export function TrackingTabs({
  stats,
  toWatch,
  upcoming,
}: {
  stats: React.ReactNode;
  toWatch: React.ReactNode;
  upcoming: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('toWatch');

  return (
    <div>
      <div className="mb-3.5 lg:hidden">{stats}</div>

      <div className="mb-3.5 flex border-b border-white/[0.07] lg:mb-6 lg:items-end lg:justify-between lg:border-white/[0.08]">
        <div className="flex flex-1 lg:flex-none lg:gap-7">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px flex-1 border-b-2 px-1 py-3 text-center text-base font-bold transition-colors lg:flex-none lg:px-0.5 lg:py-2 lg:text-[15px] lg:font-semibold ${
                activeTab === tab.id
                  ? 'border-accent text-white'
                  : 'text-text-faint border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <LayoutGrid className="text-text-faint hidden h-[19px] w-[19px] lg:mb-2 lg:block" />
      </div>

      {activeTab === 'toWatch' ? toWatch : upcoming}
    </div>
  );
}
