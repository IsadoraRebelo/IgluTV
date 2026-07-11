'use client';

import { useState } from 'react';

type TabId = 'home' | 'cast' | 'similar';

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'cast', label: 'Cast' },
  { id: 'similar', label: 'Similar' },
];

export function ShowTabs({
  home,
  cast,
  similar,
}: {
  home: React.ReactNode;
  cast: React.ReactNode;
  similar: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  return (
    <div>
      <div className="flex border-b border-white/10 sm:gap-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px flex-1 border-b-2 px-1 py-3 text-center text-base font-medium transition-colors sm:flex-none sm:py-0 sm:pb-3 sm:text-sm ${activeTab === tab.id
                ? 'border-accent text-white'
                : 'border-transparent text-[#678] hover:text-[#9ab0bf]'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-5 md:pt-6">
        {activeTab === 'home' ? home : null}
        {activeTab === 'cast' ? cast : null}
        {activeTab === 'similar' ? similar : null}
      </div>
    </div>
  );
}
