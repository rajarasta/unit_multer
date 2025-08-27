import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { 
Home, Library, Gamepad2, AppWindow, Search, Settings, Sparkles, 
  MoreHorizontal, ChevronDown, ChevronLeft, Bell, Check, CheckCheck, Plus, Minus, FileText,
  GitBranch, Clock, Download, Upload, Eye, Edit3, Trash2, Copy,
  Lock, Unlock, Users, FolderOpen, AlertCircle, Circle, Triangle, Shuffle, 
  ChevronRight, ArrowRight, ArrowUp, Loader, Truck, FileSpreadsheet,
  CheckCircle, XCircle, RefreshCw, Save, History, Package, Heart, Hexagon, Move,EyeOff,
  Calendar, Flag, Target, Zap, TrendingUp, Award, Star, MessageSquare, Image as ImageIcon, Phone,
  AlertTriangle, BarChart3, Layers, Grid3x3, Play, Pause, FastForward, Mail, ClipboardList, Building2,
  Rewind, Maximize2, Filter, Camera,ShoppingCart,QrCode, Share2, BadgeCheck, Bookmark,
  Building, MapPin, DoorOpen, Square, Maximize, Activity, X, ExternalLink // Also add X here
} from "lucide-react";


// Timeline Visualization Component
export default function TimelineVisualization() {
  const [viewType, setViewType] = useState('linear');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [events] = useState([
    {
      id: 1,
      date: new Date('2025-01-15'),
      title: 'Project Kickoff',
      description: 'Initial project meeting and requirements gathering',
      type: 'milestone',
      category: 'planning',
      icon: Flag,
      color: '#059669',
      participants: ['John Smith', 'Sarah Johnson'],
      attachments: 2
    },
    {
      id: 2,
      date: new Date('2025-02-01'),
      title: 'Design Review',
      description: 'First design iteration presented to stakeholders',
      type: 'review',
      category: 'design',
      icon: Target,
      color: '#2563eb',
      participants: ['Sarah Johnson', 'Mike Chen'],
      attachments: 5
    },
    {
      id: 3,
      date: new Date('2025-03-10'),
      title: 'Development Sprint 1',
      description: 'Core functionality implementation begins',
      type: 'sprint',
      category: 'development',
      icon: Zap,
      color: '#7c3aed',
      participants: ['Mike Chen', 'Lisa Park'],
      attachments: 0
    },
    {
      id: 4,
      date: new Date('2025-04-15'),
      title: 'Alpha Release',
      description: 'Internal testing version deployed',
      type: 'release',
      category: 'deployment',
      icon: Award,
      color: '#db2777',
      participants: ['Tom Wilson', 'Emily Davis'],
      attachments: 3
    },
    {
      id: 5,
      date: new Date('2025-05-20'),
      title: 'User Testing',
      description: 'First round of user acceptance testing',
      type: 'testing',
      category: 'quality',
      icon: Users,
      color: '#ea580c',
      participants: ['Robert Lee', 'Anna Brown'],
      attachments: 8
    },
    {
      id: 6,
      date: new Date('2025-06-01'),
      title: 'Beta Launch',
      description: 'Limited public release for feedback',
      type: 'release',
      category: 'deployment',
      icon: TrendingUp,
      color: '#0891b2',
      participants: ['All Team'],
      attachments: 4
    },
    {
      id: 7,
      date: new Date('2025-07-15'),
      title: 'Performance Review',
      description: 'System performance analysis and optimization',
      type: 'review',
      category: 'quality',
      icon: BarChart3,
      color: '#84cc16',
      participants: ['Mike Chen', 'Tom Wilson'],
      attachments: 6
    },
    {
      id: 8,
      date: new Date('2025-08-01'),
      title: 'Final Release',
      description: 'Full production deployment',
      type: 'milestone',
      category: 'deployment',
      icon: Star,
      color: '#f59e0b',
      participants: ['All Team'],
      attachments: 10
    }
  ]);

  useEffect(() => {
    if (autoPlay) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % events.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [autoPlay, events.length]);

  const getRelativeTime = (date) => {
    const now = new Date('2025-08-14');
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)} years ago`;
  };

  return (
    <div className="max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Timeline</h1>
          <p className="mt-1 text-sm opacity-80">Interactive timeline visualization with milestones and events</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoPlay(!autoPlay)}
            className={`px-3 py-2 rounded-xl flex items-center gap-2 ${
              autoPlay ? 'bg-slate-900 text-white' : 'bg-slate-100 ring-1 ring-slate-200'
            }`}
          >
            {autoPlay ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {autoPlay ? 'Pause' : 'Play'}
          </button>
          <button className="px-3 py-2 rounded-xl bg-slate-100 ring-1 ring-slate-200 flex items-center gap-2">
            <Grid3x3 className="h-4 w-4" />
            Grid View
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium">View:</span>
        {['linear', 'milestone'].map(type => (
          <button
            key={type}
            onClick={() => setViewType(type)}
            className={`px-3 py-1 rounded-lg text-sm capitalize transition-colors ${
              viewType === type 
                ? 'bg-slate-900 text-white' 
                : 'bg-slate-100 ring-1 ring-slate-200 hover:bg-slate-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {viewType === 'linear' && (
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-6">
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-200" />
            
            <div className="space-y-6">
              {events.map((event, idx) => {
                const Icon = event.icon;
                const isActive = currentIndex === idx;
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`relative flex gap-4 ${isActive ? 'scale-105' : ''}`}
                  >
                    <motion.div
                      className="relative z-10 w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: event.color + '20', border: `3px solid ${event.color}` }}
                      whileHover={{ scale: 1.1 }}
                      animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                    >
                      <Icon className="h-6 w-6" style={{ color: event.color }} />
                    </motion.div>

                    <motion.div
                      className="flex-1 rounded-xl ring-1 ring-slate-200 bg-white p-4 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedEvent(event)}
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{event.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ring-1 ${
                              event.type === 'milestone' ? 'bg-amber-100 text-amber-800 ring-amber-200' :
                              event.type === 'release' ? 'bg-green-100 text-green-800 ring-green-200' :
                              'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}>
                              {event.type}
                            </span>
                          </div>
                          <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {event.date.toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {getRelativeTime(event.date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {event.participants.length} participants
                            </span>
                            {event.attachments > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                {event.attachments} files
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {viewType === 'milestone' && (
        <div className="rounded-2xl ring-1 ring-slate-200 bg-white p-6">
          <div className="relative h-32">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 rounded-full -translate-y-1/2">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '75%' }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>

            <div className="relative h-full flex justify-between items-center">
              {events.filter(e => e.type === 'milestone' || e.type === 'release').map((event, idx, arr) => {
                const Icon = event.icon;
                
                return (
                  <motion.div
                    key={event.id}
                    className="relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.2 }}
                  >
                    <motion.div
                      className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
                      style={{ backgroundColor: event.color + '20', border: `3px solid ${event.color}` }}
                      whileHover={{ scale: 1.15 }}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Icon className="h-5 w-5" style={{ color: event.color }} />
                    </motion.div>
                    <div className="mt-2 text-center absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <p className="text-xs font-medium">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.date.toLocaleDateString()}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {autoPlay && (
        <div className="mt-4 rounded-2xl ring-1 ring-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="p-1 rounded-lg hover:bg-slate-100">
                <Rewind className="h-4 w-4" />
              </button>
              <button
                onClick={() => setAutoPlay(!autoPlay)}
                className="p-2 rounded-lg bg-slate-900 text-white"
              >
                <Pause className="h-4 w-4" />
              </button>
              <button className="p-1 rounded-lg hover:bg-slate-100">
                <FastForward className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 mx-4">
              <div className="h-1 bg-slate-200 rounded-full">
                <motion.div
                  className="h-full bg-slate-900 rounded-full"
                  style={{ width: `${((currentIndex + 1) / events.length) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-slate-600">
              {currentIndex + 1} / {events.length}
            </span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: selectedEvent.color + '20' }}
                  >
                                      {(() => {
                    const Icon = selectedEvent.icon;
                    return <Icon className="h-6 w-6" style={{ color: selectedEvent.color }} />;
                  })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedEvent.title}</h2>
                    <p className="text-sm text-slate-600">{selectedEvent.date.toLocaleDateString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1 rounded-lg hover:bg-slate-100"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-slate-700 mb-4">{selectedEvent.description}</p>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-slate-600">Participants:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedEvent.participants.map(p => (
                      <span key={p} className="text-sm px-2 py-1 rounded-lg bg-slate-100">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      {selectedEvent.category}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {selectedEvent.attachments} attachments
                    </span>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-sm">
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


