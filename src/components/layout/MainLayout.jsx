import React from 'react';
import Sidebar from './Sidebar';
export default function MainLayout({ children, activeTab, setActiveTab, navItems }) {
  return (
    <div className="h-screen w-full bg-white text-slate-900 overflow-hidden">
      <div className="h-full w-full flex">
        {/* Sidebar */}
        <div className="w-[250px] flex-shrink-0">
          <Sidebar 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            navItems={navItems}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

