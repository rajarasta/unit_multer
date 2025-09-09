/**
 * IRIS3 Projektiranje Containers Component
 * Displays 4 detail containers: Shema, Donja, Bočni, Gornji
 * Local to IRIS3 tab - UI only, no business logic
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SchemaRenderer from './SchemaRenderer.jsx';

const ProjektiranjeContainers = ({
  projektDetails = null,
  onClose = () => {}
}) => {
  const [hoveredDonji, setHoveredDonji] = useState(false);

  if (!projektDetails) return null;

  const donjiRecommendations = [
    {
      title: "Sa pragom",
      warning: "sa 50% više reklamacija",
      image: "/demo_data2/donji_detalj1.png"
    },
    {
      title: "Sa četkicom", 
      warning: "ne može u ovom sistemu, ali znam da pitate, ali ne može",
      image: "/demo_data2/donji_detalj1.png"
    },
    {
      title: "Sa padajućom brtvom",
      warning: null,
      image: "/demo_data2/donji_detalj1.png"
    },
    {
      title: "Uprem sa pragom",
      warning: null,
      image: "/demo_data2/donji_detalj1.png"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-4 text-center">
        <button 
          onClick={onClose}
          className="text-sm text-secondary hover:text-primary transition-colors"
        >
          ← Zatvori detalje
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-6 h-[calc(100vh-200px)] max-w-7xl mx-auto p-4">
        {/* 1. Shema - CSS rendered based on product type */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0, duration: 0.5 }}
          className="input-bg border border-theme rounded-lg overflow-hidden flex flex-col h-full"
        >
          <div className="flex-1">
            <SchemaRenderer 
              productType={projektDetails.product_type}
              systemName={projektDetails.system}
            />
          </div>
          <div className="p-3 bg-gradient-to-r from-accent to-accent/80">
            <div className="text-sm text-white font-semibold">1. SHEMA</div>
            <div className="text-xs text-white/90">
              Sistem: {projektDetails.system} | Tip: {projektDetails.product_type}
            </div>
          </div>
        </motion.div>

        {/* 2. Donji detalj */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="input-bg border border-theme rounded-lg overflow-visible flex flex-col h-full relative"
          onMouseEnter={() => setHoveredDonji(true)}
          onMouseLeave={() => setHoveredDonji(false)}
        >
          {projektDetails.details?.donji_detalj?.has_image ? (
            <>
              <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <img 
                  src={projektDetails.details.donji_detalj.image_url} 
                  alt="Donji detalj"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  style={{ maxHeight: 'calc(100% - 8px)', maxWidth: 'calc(100% - 8px)' }}
                />
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600">
                <div className="text-sm text-white font-semibold">2. DONJI DETALJ</div>
                <div className="text-xs text-white/90">
                  Varijanta: {projektDetails.details.donji_detalj.variant}
                </div>
              </div>

              {/* Hover Recommendations */}
              <AnimatePresence>
                {hoveredDonji && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border-2 border-blue-200 p-4 z-50"
                  >
                    <div className="text-sm font-semibold text-blue-700 mb-3">Preporuke za donji detalj:</div>
                    <div className="grid grid-cols-2 gap-3">
                      {donjiRecommendations.map((rec, index) => (
                        <motion.div
                          key={rec.title}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          {rec.warning && (
                            <div className="text-xs text-red-600 font-medium mb-1 leading-tight">
                              ⚠️ {rec.warning}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <img 
                              src={rec.image} 
                              alt={rec.title}
                              className="w-8 h-8 object-contain rounded border"
                            />
                            <div className="text-xs font-medium text-gray-800">
                              {rec.title}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="w-full flex-1 bg-slate-200 flex flex-col items-center justify-center p-4">
              <div className="text-sm text-blue-600 font-semibold mb-2">2. DONJI DETALJ</div>
              <div className="text-xs text-secondary">
                Detalj nije dostupan
              </div>
            </div>
          )}
        </motion.div>

        {/* 3. Bočni detalj */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="input-bg border border-theme rounded-lg overflow-hidden flex flex-col h-full"
        >
          {projektDetails.details?.bocni_detalj?.has_image ? (
            <>
              <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <img 
                  src={projektDetails.details.bocni_detalj.image_url} 
                  alt="Bočni detalj"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  style={{ maxHeight: 'calc(100% - 8px)', maxWidth: 'calc(100% - 8px)' }}
                />
              </div>
              <div className="p-3 bg-gradient-to-r from-green-500 to-green-600">
                <div className="text-sm text-white font-semibold">3. BOČNI DETALJ</div>
              </div>
            </>
          ) : (
            <div className="w-full flex-1 bg-slate-200 flex flex-col items-center justify-center p-4">
              <div className="text-sm text-green-600 font-semibold mb-2">3. BOČNI DETALJ</div>
              <div className="text-xs text-secondary">
                Detalj nije dostupan
              </div>
            </div>
          )}
        </motion.div>

        {/* 4. Gornji detalj */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="input-bg border border-theme rounded-lg overflow-hidden flex flex-col h-full"
        >
          {projektDetails.details?.gornji_detalj?.has_image ? (
            <>
              <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <img 
                  src={projektDetails.details.gornji_detalj.image_url} 
                  alt="Gornji detalj"
                  className="max-w-full max-h-full w-auto h-auto object-contain"
                  style={{ maxHeight: 'calc(100% - 8px)', maxWidth: 'calc(100% - 8px)' }}
                />
              </div>
              <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600">
                <div className="text-sm text-white font-semibold">4. GORNJI DETALJ</div>
                <div className="text-xs text-white/90">
                  Varijanta: {projektDetails.details.gornji_detalj.variant}
                </div>
              </div>
            </>
          ) : (
            <div className="w-full flex-1 bg-slate-200 flex flex-col items-center justify-center p-4">
              <div className="text-sm text-purple-600 font-semibold mb-2">4. GORNJI DETALJ</div>
              <div className="text-xs text-secondary">
                Detalj nije dostupan
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProjektiranjeContainers;