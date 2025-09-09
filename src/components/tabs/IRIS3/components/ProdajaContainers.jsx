/**
 * IRIS3 Prodaja Containers Component
 * Displays 4 analysis containers: System, Product Type, Brochure, Pricing
 * Local to IRIS3 tab - UI only, no business logic
 */

import React from 'react';
import { motion } from 'framer-motion';

const ProdajaContainers = ({
  schuroAnalysis = null,
  activeTab = 'prodaja',
  onClose = () => {}
}) => {
  if (!schuroAnalysis) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mb-4 text-center">
        <button 
          onClick={onClose}
          className="text-sm text-secondary hover:text-primary transition-colors"
        >
          ← Zatvori rezultate
        </button>
        {activeTab === 'projektiranje' && (
          <div className="text-xs text-accent mt-1">
            Rečite "Primjeni standardne detalje" za prelazak na projektiranje prikaz
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full max-w-5xl mx-auto">
        {/* 1. System Analysis Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0, duration: 0.5 }}
          className="input-bg border border-theme rounded-lg p-4 flex-1 flex flex-col"
        >
          <div className="text-xs text-accent font-semibold mb-3">1. SISTEM ANALIZA</div>
          
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {schuroAnalysis.analysis?.sistema_considered?.map((sistem, index) => (
                <motion.div
                  key={sistem}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className={`p-2 rounded-lg text-center text-xs font-medium border-2 ${
                    sistem === schuroAnalysis.analysis?.sistema_selected
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-red-100 border-red-300 text-red-600'
                  }`}
                >
                  {sistem}
                </motion.div>
              ))}
            </div>
            
            <div className="mt-auto">
              <div className="text-xs font-medium text-primary mb-1">
                Odabrano: {schuroAnalysis.analysis?.sistema_selected}
              </div>
              <div className="text-xs text-secondary">
                {schuroAnalysis.analysis?.reasoning}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 2. Product Type Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="input-bg border border-theme rounded-lg p-4 flex-1 flex flex-col"
        >
          <div className="text-xs text-accent font-semibold mb-3">2. TIP PROIZVODA</div>
          
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between gap-2 mb-3">
              {/* Vrata */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                className={`flex-1 p-3 rounded-lg text-center border-2 ${
                  schuroAnalysis.tip?.selected === 'vrata'
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : schuroAnalysis.tip?.considered?.includes('vrata')
                    ? 'bg-red-100 border-red-300 text-red-600'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
              >
                <div className="w-8 h-12 mx-auto mb-1 relative">
                  <div className="w-full h-full border-2 border-current rounded"></div>
                  <div className="absolute right-1 top-6 w-1 h-1 bg-current rounded-full"></div>
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-current"></div>
                </div>
                <div className="text-xs font-medium">Vrata</div>
              </motion.div>

              {/* Prozor */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.3 }}
                className={`flex-1 p-3 rounded-lg text-center border-2 ${
                  schuroAnalysis.tip?.selected === 'prozor'
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : schuroAnalysis.tip?.considered?.includes('prozor')
                    ? 'bg-red-100 border-red-300 text-red-600'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
              >
                <div className="w-8 h-10 mx-auto mb-1 relative">
                  <div className="w-full h-full border-2 border-current rounded"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-current"></div>
                  <div className="absolute top-1/2 left-1 right-1 transform -translate-y-1/2 h-0.5 bg-current"></div>
                </div>
                <div className="text-xs font-medium">Prozor</div>
              </motion.div>

              {/* Fasada */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.3 }}
                className={`flex-1 p-3 rounded-lg text-center border-2 ${
                  schuroAnalysis.tip?.selected === 'fasada'
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : schuroAnalysis.tip?.considered?.includes('fasada')
                    ? 'bg-red-100 border-red-300 text-red-600'
                    : 'bg-gray-100 border-gray-300 text-gray-500'
                }`}
              >
                <div className="w-8 h-10 mx-auto mb-1 relative">
                  <div className="w-full h-full border-2 border-current rounded-sm"></div>
                  <div className="absolute top-0 left-0 right-0 h-3 border-b border-current"></div>
                  <div className="absolute top-3 left-0 right-0 h-3 border-b border-current"></div>
                  <div className="absolute top-6 left-0 right-0 h-3 border-b border-current"></div>
                  <div className="absolute top-1/2 left-0 right-0 transform -translate-y-1/2 h-0.5 bg-current"></div>
                </div>
                <div className="text-xs font-medium">Fasada</div>
              </motion.div>
            </div>
            
            <div className="mt-auto">
              <div className="text-xs font-medium text-primary mb-1">
                Odabrano: {schuroAnalysis.tip?.selected}
              </div>
              <div className="text-xs text-secondary">
                {schuroAnalysis.tip?.reasoning}
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. Brochure Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0, duration: 0.5 }}
          className="input-bg border border-theme rounded-lg flex-1 overflow-hidden relative"
        >
          {schuroAnalysis.brochure?.has_image ? (
            <>
              <img 
                src={schuroAnalysis.brochure.image_url} 
                alt={schuroAnalysis.brochure.system}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                <div className="text-xs text-white font-semibold">3. BROŠURA</div>
                <div className="text-xs text-white/90">
                  {schuroAnalysis.brochure?.system}
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center">
              <div className="text-xs text-accent font-semibold mb-2">3. BROŠURA</div>
              <div className="text-sm text-secondary mb-2">
                Sistem: {schuroAnalysis.brochure?.system}
              </div>
              <div className="text-xs text-secondary">
                Brošura nije dostupna
              </div>
            </div>
          )}
        </motion.div>

        {/* 4. Pricing Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="input-bg border border-theme rounded-lg p-4 flex-1"
        >
          <div className="text-xs text-accent font-semibold mb-2">4. CIJENA</div>
          <div className="text-sm text-primary space-y-1">
            <div className="flex justify-between">
              <span>Materijal:</span>
              <span>{schuroAnalysis.pricing?.materijal} {schuroAnalysis.pricing?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Staklo:</span>
              <span>{schuroAnalysis.pricing?.staklo} {schuroAnalysis.pricing?.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Rad:</span>
              <span>{schuroAnalysis.pricing?.rad} {schuroAnalysis.pricing?.currency}</span>
            </div>
            <div className="flex justify-between font-medium border-t border-theme pt-1">
              <span>Ukupno:</span>
              <span>{schuroAnalysis.pricing?.total} {schuroAnalysis.pricing?.currency}</span>
            </div>
            
            {/* Troskovnik comparison section */}
            {schuroAnalysis.troskovnik_check && (
              <div className="mt-3 p-2 border border-theme rounded bg-slate-50">
                <div className="text-xs text-accent font-semibold mb-1">PROVJERA TROŠKOVNIK</div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Troškovnik:</span>
                    <span>{schuroAnalysis.troskovnik_check.troskovnik_price} EUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LLM procjena:</span>
                    <span>{schuroAnalysis.troskovnik_check.llm_price} EUR</span>
                  </div>
                  <div className={`flex justify-between font-medium ${
                    schuroAnalysis.troskovnik_check.color === 'red' 
                      ? 'text-red-600' 
                      : 'text-green-600'
                  }`}>
                    <span>Razlika:</span>
                    <span>{schuroAnalysis.troskovnik_check.difference} EUR {schuroAnalysis.troskovnik_check.status}</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="text-xs text-secondary mt-2">
              Lokacija: {schuroAnalysis.location}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProdajaContainers;