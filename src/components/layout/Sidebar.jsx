import React from 'react';
import { Sparkles, Palette } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';
import UserDropdown from './UserDropdown';
import { cycleTheme } from '../../theme/manager';

export default function Sidebar({ activeTab, setActiveTab, navItems }) {
  const { currentUser, hasPermission } = useUserStore();

  // Filter navigation items based on user permissions
  const filteredNavItems = navItems.filter(item => {
    if (item.key === 'users') {
      return hasPermission('manage_users');
    }
    return true;
  });

  return (
    <aside className="h-full panel sidebar-panel flex flex-col">
      <div className="p-4">
        <div className="px-2 py-1 text-sm font-semibold text-primary flex items-center justify-between">
          <span>Aluminum Store</span>
          <button
            title="Promijeni stil"
            onClick={() => cycleTheme()}
            className="nav-link p-1.5 rounded-md border border-theme text-slate-500 hover:text-slate-700"
          >
            <Palette className="h-4 w-4" />
          </button>
        </div>
        {currentUser && (
          <div className="text-xs text-subtle px-2 mt-1">
            {currentUser.department || 'Sustav upravljanja'}
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto">
        <button
          key="demo"
          onClick={() => setActiveTab('home')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm nav-link border border-theme ${
            activeTab === 'home' ? 'active-nav-link' : ''
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Demo</span>
        </button>

        {filteredNavItems.map(({ key, label, icon: Icon, badge }) => {
          const isActive = activeTab === key;
          const base = 'nav-link border border-theme';
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${base} ${isActive ? 'active-nav-link' : ''}`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span
                  className={`nav-badge ${badge.pulse ? 'nav-badge--pulse' : ''} ${badge.color ? `nav-badge--${badge.color}` : ''}`}
                  aria-label="notification"
                >
                  {typeof badge.count === 'number' && badge.count > 0
                    ? Math.min(badge.count, 99)
                    : ''}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Dropdown */}
      <div className="p-4 border-t border-slate-200">
        <UserDropdown />
      </div>
    </aside>
  );
}
