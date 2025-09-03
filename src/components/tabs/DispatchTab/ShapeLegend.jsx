import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import { AluminumShapes } from './AluminumShapes';

const ShapeLegend = () => {
  const [isOpen, setIsOpen] = useState(false);

  const shapes = [
    {
      Component: AluminumShapes.Window,
      title: "Prozor",
      description: "Aluminijski prozori s termoizolacijskim staklom"
    },
    {
      Component: AluminumShapes.Door,
      title: "Vrata",
      description: "Ulazna i unutarnja vrata različitih dimenzija"
    },
    {
      Component: AluminumShapes.Roller,
      title: "Roletna",
      description: "Električne i manuelne roletne s aluminijskim lamelama"
    },
    {
      Component: AluminumShapes.Railing,
      title: "Balkonska ograda",
      description: "Staklene ograde s aluminijskim okvirom"
    },
    {
      Component: AluminumShapes.FacadePanel,
      title: "Fasadni panel",
      description: "Kompozitni paneli za vanjsku oblogu"
    },
    {
      Component: AluminumShapes.LProfile,
      title: "L-profil",
      description: "Strukturalni profili za okvire i konstrukcije"
    },
    {
      Component: AluminumShapes.TProfile,
      title: "T-profil", 
      description: "Nosivi profili za ojačanja i spojeve"
    },
    {
      Component: AluminumShapes.UProfile,
      title: "U-profil",
      description: "Završni profili za rubove i zaštite"
    }
  ];

  return (
    <>
      {/* Help Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors z-40"
        title="Legenda tipova artikala"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Legend Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Legenda tipova aluminium artikala
                  </h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Pregled različitih tipova aluminium proizvoda s vizualnim prikazom
                </p>
              </div>

              {/* Shapes Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {shapes.map((shape, index) => {
                    const { Component, title, description } = shape;
                    return (
                      <motion.div
                        key={title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-center mb-4 p-4 bg-gray-50 rounded-lg">
                          <Component size={64} className="text-blue-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2 text-center">
                          {title}
                        </h3>
                        <p className="text-sm text-gray-600 text-center leading-relaxed">
                          {description}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Additional Info */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">ℹ️ Napomene</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ikone se automatski dodjeljuju na osnovu naziva pozicije</li>
                    <li>• Različite boje označavaju status pozicije (završeno, u radu, problem)</li>
                    <li>• Kliknite na karticu za detaljni prikaz komada i dokumenata</li>
                    <li>• Koristite + gumb za dodavanje u šaržu za otpremu</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ShapeLegend;