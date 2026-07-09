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
      <div className="flex gap-6 border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-main text-white'
                : 'border-transparent text-[#678] hover:text-[#9ab0bf]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">
        {activeTab === 'home' ? home : null}
        {activeTab === 'cast' ? cast : null}
        {activeTab === 'similar' ? similar : null}
      </div>
    </div>
  );
}
