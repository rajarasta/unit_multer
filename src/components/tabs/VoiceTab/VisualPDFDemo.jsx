import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  CheckCircle, 
  Download, 
  Target, 
  Brain, 
  Zap 
} from 'lucide-react';

export default function VisualPDFDemo() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedParagraphs, setExtractedParagraphs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedSection, setHighlightedSection] = useState(null);
  const [floatingTexts, setFloatingTexts] = useState([]);

  const mockPDFPages = [
    {
      id: 1,
      title: "Račun Aluminijski Profili AGS d.o.o.",
      sections: [
        {
          id: 'invoice-1',
          text: "Račun br: 2024-00158 | Datum: 15.03.2024 | Kupac: Građevno poduzeće Rijeka",
          position: { top: '15%', left: '10%', width: '80%' },
          category: 'header'
        },
        {
          id: 'invoice-2', 
          text: "ALP-6060-T5 profil 50x30x2mm - 25 kom x 12.50 EUR = 312.50 EUR",
          position: { top: '35%', left: '10%', width: '75%' },
          category: 'item'
        },
        {
          id: 'invoice-3',
          text: "Prašno lakiranje RAL 7016 - 5.5 m² x 18.00 EUR = 99.00 EUR",
          position: { top: '55%', left: '10%', width: '70%' },
          category: 'service'
        },
        {
          id: 'invoice-4',
          text: "UKUPNO: 411.50 EUR + PDV 25% = 514.38 EUR",
          position: { top: '75%', left: '10%', width: '85%' },
          category: 'total'
        }
      ]
    },
    {
      id: 2,
      title: "Technička Specifikacija",
      sections: [
        {
          id: 'spec-1',
          text: "Minimalna debljina zida 2.0mm prema EN 755-2 standardu",
          position: { top: '20%', left: '15%', width: '70%' },
          category: 'standard'
        },
        {
          id: 'spec-2',
          text: "Površinska obrada anodizacija 15μm ili prašno lakiranje",
          position: { top: '40%', left: '10%', width: '80%' },
          category: 'treatment'
        },
        {
          id: 'spec-3',
          text: "Dostava 3-5 radnih dana. Jamstvo 15 godina strukturna uporaba.",
          position: { top: '60%', left: '12%', width: '75%' },
          category: 'warranty'
        }
      ]
    }
  ];

  const categoryColors = {
    header: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
    item: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
    service: { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
    total: { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800' },
    standard: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
    treatment: { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-800' },
    warranty: { bg: 'bg-teal-100', border: 'border-teal-300', text: 'text-teal-800' }
  };

  const startExtraction = async () => {
    setIsExtracting(true);
    setExtractedParagraphs([]);
    setFloatingTexts([]);
    
    for (let pageIndex = 0; pageIndex < mockPDFPages.length; pageIndex++) {
      const page = mockPDFPages[pageIndex];
      setCurrentPage(page.id);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      for (let sectionIndex = 0; sectionIndex < page.sections.length; sectionIndex++) {
        const section = page.sections[sectionIndex];
        
        setHighlightedSection(section.id);
        
        const floatingId = `${section.id}-${Date.now()}`;
        setFloatingTexts(prev => [...prev, {
          id: floatingId,
          text: section.text,
          category: section.category,
          startPosition: section.position,
          timestamp: Date.now()
        }]);
        
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        const extractedParagraph = {
          id: section.id,
          text: section.text,
          category: section.category,
          page: page.id,
          pageTitle: page.title,
          extractedAt: Date.now()
        };
        
        setExtractedParagraphs(prev => [...prev, extractedParagraph]);
        
        setTimeout(() => {
          setFloatingTexts(prev => prev.filter(ft => ft.id !== floatingId));
        }, 2000);
        
        setHighlightedSection(null);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    setIsExtracting(false);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-6 py-4 rounded-xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Visual PDF Document Processing
            </h3>
            <p className="text-green-100 text-sm mt-1">
              Simulacija izvlačenja sadržaja iz PDF računa i specifikacija
            </p>
          </div>
          <button
            onClick={startExtraction}
            disabled={isExtracting}
            className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all disabled:opacity-50"
          >
            {isExtracting ? 'Izvlačim...' : 'Pokreni Izvlačenje'}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* PDF Viewer Simulation */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-t-xl">
            <h4 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PDF Stranica {currentPage}
            </h4>
          </div>
          
          <div className="p-4">
            <div className="relative bg-gray-50 border border-gray-200 rounded-lg h-96 overflow-hidden">
              {/* Simulated PDF Content */}
              <div className="absolute inset-0 p-6">
                <div className="text-center mb-4">
                  <h5 className="font-bold text-gray-800">
                    {mockPDFPages.find(p => p.id === currentPage)?.title}
                  </h5>
                </div>
                
                {/* Simulate PDF sections */}
                <AnimatePresence>
                  {mockPDFPages
                    .find(p => p.id === currentPage)?.sections.map((section) => (
                      <motion.div
                        key={section.id}
                        className={`absolute text-xs text-gray-700 p-2 rounded ${
                          highlightedSection === section.id 
                            ? 'bg-yellow-200 border-2 border-yellow-400 shadow-lg' 
                            : 'bg-white border border-gray-300'
                        }`}
                        style={section.position}
                        animate={highlightedSection === section.id ? {
                          scale: [1, 1.02, 1],
                        } : {}}
                        transition={{ duration: 0.5 }}
                      >
                        {section.text}
                      </motion.div>
                    ))
                  }
                </AnimatePresence>
                
                {/* Floating extracted texts */}
                <AnimatePresence>
                  {floatingTexts.map((floatingText) => (
                    <motion.div
                      key={floatingText.id}
                      initial={{ 
                        opacity: 1,
                        ...floatingText.startPosition,
                        position: 'absolute'
                      }}
                      animate={{
                        opacity: 0.8,
                        top: '50%',
                        left: '90%',
                        transform: 'translate(-50%, -50%)'
                      }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="text-xs bg-green-500 text-white p-2 rounded shadow-lg z-10 pointer-events-none"
                    >
                      📄 {floatingText.category}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
                      >
                        <Download className="w-2 h-2 text-white" />
                      </motion.div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Extracted Results Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-4 py-3 rounded-t-xl">
            <h4 className="font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Izvučeni Sadržaj
            </h4>
          </div>
          
          <div className="p-4 max-h-96 overflow-y-auto space-y-3">
            <AnimatePresence>
              {extractedParagraphs.map((paragraph, index) => (
                <motion.div
                  key={paragraph.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                  className={`p-3 rounded-lg border-l-4 shadow-sm ${
                    categoryColors[paragraph.category]?.bg || 'bg-gray-100'
                  } ${
                    categoryColors[paragraph.category]?.border || 'border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${
                      categoryColors[paragraph.category]?.text || 'text-gray-600'
                    }`}>
                      {paragraph.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      Str. {paragraph.page} • {paragraph.pageTitle}
                    </span>
                  </div>
                  <p className="text-sm text-gray-800">{paragraph.text}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    Izvučeno: {new Date(paragraph.extractedAt).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {extractedParagraphs.length === 0 && !isExtracting && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Pokreni demo da vidiš izvlačenje paragrafa</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Inteligencija
          </h4>
          <p className="text-blue-800 text-sm">
            Agent automatski prepoznaje različite tipove sadržaja u računu i kategorizira ih prema važnosti.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Real-time Obrada
          </h4>
          <p className="text-green-800 text-sm">
            Paragrafi se izvlače u stvarnom vremenu s vizualnim animacijama za bolji UX.
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Precizno Targeting
          </h4>
          <p className="text-purple-800 text-sm">
            Svaki paragraf je precizno lociran i kategoriziran prema sadržaju i važnosti.
          </p>
        </div>
      </div>
    </div>
  );
}