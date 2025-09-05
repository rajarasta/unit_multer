import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import AppBackground from './AppBackground';
export default function MainLayout({ children, activeTab, setActiveTab, navItems }) {
  useEffect(() => {
    const handleTabSwitch = (event) => {
      const { tab } = event.detail;
      if (tab && setActiveTab) {
        setActiveTab(tab.toLowerCase());
      }
    };

    const handleMediaAISwitchToChat = (event) => {
      console.log('🔄 Switching to chat tab via media-ai event');
      if (setActiveTab) {
        setActiveTab('chat');
      }
    };

    window.addEventListener('switchToTab', handleTabSwitch);
    window.addEventListener('media-ai:switch-to-chat', handleMediaAISwitchToChat);
    
    return () => {
      window.removeEventListener('switchToTab', handleTabSwitch);
      window.removeEventListener('media-ai:switch-to-chat', handleMediaAISwitchToChat);
    };
  }, [setActiveTab]);

  return (
    <div className="h-screen w-full overflow-hidden relative">
      <AppBackground />
      <div className="h-full w-full flex relative z-10">
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

