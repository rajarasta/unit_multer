import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, Search, Plus, Download, Share } from 'lucide-react';
import Unit from './Unit';

const PlaceholderTab = () => {
  const [unitStates, setUnitStates] = useState({
    1: { type: 'empty', content: null },
    2: { type: 'empty', content: null },
    3: { type: 'empty', content: null },
    4: { type: 'empty', content: null }
  });

  const actionIcons = [
    { icon: Settings, label: 'Settings' },
    { icon: Bell, label: 'Notifications' },
    { icon: Search, label: 'Search' },
    { icon: Plus, label: 'Add New' },
    { icon: Download, label: 'Download' },
    { icon: Share, label: 'Share' }
  ];

  const handleContentChange = useCallback((unitId, type, content) => {
    setUnitStates(prev => ({
      ...prev,
      [unitId]: { type, content }
    }));
  }, []);

  return (
    <div className="h-screen flex -m-6 mb-0">
        {/* Main Container - 2x2 Grid */}
        <div className="flex-1 p-1">
          <div className="grid grid-cols-2 grid-rows-2 gap-1 min-h-full">
            {[1, 2, 3, 4].map((unitId, index) => (
              <motion.div
                key={unitId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="h-full"
              >
                <Unit
                  id={unitId}
                  onContentChange={handleContentChange}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-16 bg-slate-50 border-l border-slate-200 flex flex-col items-center py-4 space-y-3">
          {actionIcons.map((action, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow border border-slate-200 group"
              title={action.label}
            >
              <action.icon 
                size={20} 
                className="text-slate-600 group-hover:text-slate-800 transition-colors" 
              />
            </motion.button>
          ))}
        </div>
    </div>
  );
};

export default PlaceholderTab;