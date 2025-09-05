import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  Square, 
  Volume2, 
  Settings,
  Calendar,
  Users,
  FileText,
  BarChart3,
  X,
  ChevronRight,
  Zap
} from 'lucide-react';
import { Button } from '../../ui/Primitives';

const DOMAIN_OPTIONS = [
  {
    id: 'gantt',
    title: 'Gantt Planning',
    description: 'Upravljanje rasporedom montaže i resursa',
    icon: Calendar,
    color: 'blue',
    available: true
  },
  {
    id: 'users',
    title: 'User Management', 
    description: 'Upravljanje korisnicima i ulogama',
    icon: Users,
    color: 'green',
    available: false
  },
  {
    id: 'documents',
    title: 'Document Processing',
    description: 'Obrada računa i dokumenata',
    icon: FileText,
    color: 'orange',
    available: false
  },
  {
    id: 'reports',
    title: 'Reports & Analytics',
    description: 'Izvještaji i analitika',
    icon: BarChart3,
    color: 'purple',
    available: false
  }
];

export default function VoiceOrchestratorTab({ onDomainSelect }) {

  const handleDomainSelect = useCallback((domain) => {
    console.log(`🎯 Domain selected: ${domain.id}, navigating...`);
    
    // Immediate navigation to domain-specific tab
    if (onDomainSelect) {
      onDomainSelect(domain);
    }
  }, [onDomainSelect]);


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Voice Orchestrator</h1>
        <p className="text-gray-600">
          Glasovno upravljanje sustavom - odaberite domenu za editiranje
        </p>
      </div>

      <div className="space-y-8">
        {/* Domain Selection - Always visible */}
        <DomainSelection onDomainSelect={handleDomainSelect} />
      </div>
    </div>
  );
}

// Domain Selection Component
function DomainSelection({ onDomainSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <Zap className="w-12 h-12 mx-auto text-blue-500" />
        <h2 className="text-2xl font-semibold">Odaberite domenu za glasovno uređivanje</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Kliknite na domenu koju želite uređivati glasovnim naredbama. 
          Sustav će pokrenuti snimanje i procesirati vaš govor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {DOMAIN_OPTIONS.map((domain) => {
          const IconComponent = domain.icon;

          return (
            <motion.div
              key={domain.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="h-full"
            >
              <div 
                className={`
                  h-full cursor-pointer transition-all duration-200 border rounded-xl p-6 bg-white shadow-sm
                  ${domain.available 
                    ? 'hover:shadow-lg hover:border-blue-300 hover:bg-blue-50' 
                    : 'opacity-50 cursor-not-allowed border-gray-200'
                  }
                `}
                onClick={domain.available ? () => onDomainSelect(domain) : undefined}
              >
                <div className="h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                        <IconComponent className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="text-center space-y-2">
                      <h3 className="font-semibold text-lg">{domain.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{domain.description}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center">
                    {!domain.available ? (
                      <span className="text-xs px-3 py-1 bg-gray-200 rounded-full">Uskoro</span>
                    ) : (
                      <div className="flex items-center text-blue-600 text-sm font-medium">
                        <span>Odaberi</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}