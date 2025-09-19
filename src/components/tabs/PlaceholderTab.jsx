import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Bell, Search, Plus, Download, Share } from 'lucide-react';

const PlaceholderTab = () => {
  const actionIcons = [
    { icon: Settings, label: 'Settings' },
    { icon: Bell, label: 'Notifications' },
    { icon: Search, label: 'Search' },
    { icon: Plus, label: 'Add New' },
    { icon: Download, label: 'Download' },
    { icon: Share, label: 'Share' }
  ];

  const units = [
    {
      id: 1,
      title: "Unit 1",
      data: { value: 1250, status: "Active", progress: 75 },
      color: "blue"
    },
    {
      id: 2,
      title: "Unit 2", 
      data: { value: 890, status: "Pending", progress: 45 },
      color: "green"
    },
    {
      id: 3,
      title: "Unit 3",
      data: { value: 2100, status: "Complete", progress: 100 },
      color: "purple"
    },
    {
      id: 4,
      title: "Unit 4",
      data: { value: 650, status: "Error", progress: 25 },
      color: "red"
    }
  ];

  return (
    <div className="h-screen flex -m-6 mb-0">
        {/* Main Container - 2x2 Grid */}
        <div className="flex-1 p-1">
          <div className="grid grid-cols-2 grid-rows-2 gap-1 min-h-full">
            {units.map((unit, index) => (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="bg-white rounded border border-slate-200 p-2 shadow-sm h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-slate-700">{unit.title}</h3>
                  <div className={`w-2 h-2 rounded-full bg-${unit.color}-500`}></div>
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className="text-xl font-bold text-slate-800">{unit.data.value}</div>
                  <div className="text-xs text-slate-500">{unit.data.status}</div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                      className={`bg-${unit.color}-500 h-1.5 rounded-full transition-all duration-300`}
                      style={{ width: `${unit.data.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-slate-400">{unit.data.progress}%</div>
                </div>
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