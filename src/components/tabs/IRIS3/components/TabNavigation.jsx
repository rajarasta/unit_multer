/**
 * IRIS3 Tab Navigation Component
 * Tab navigation for Prodaja/Projektiranje/Priprema/Proizvodnja
 * Local to IRIS3 tab - UI only, no business logic
 */

import React from 'react';
import { IRIS3_TABS } from '../../../../utils/schutoConstants';

const TabNavigation = ({
  activeTab = 'prodaja',
  onTabChange = () => {}
}) => {
  return (
    <div className="border-b border-theme">
      <nav className="flex space-x-8 px-6">
        {IRIS3_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-secondary hover:text-primary hover:border-theme'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;