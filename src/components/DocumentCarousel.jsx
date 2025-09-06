// src/components/DocumentCarousel.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { FileText, MessageSquare, ArrowLeft, ArrowRight } from 'lucide-react';

const CarouselItem = ({ doc, index, activeIndex, setActiveIndex }) => {
  const distance = index - activeIndex;
  const isActive = distance === 0;

  // Definiranje izgleda ovisno o poziciji (Fokus vs Blur + 3D)
  const variants = {
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
      filter: "blur(0px) grayscale(0%)",
      zIndex: 10,
      rotateY: 0, // Ravno prema korisniku
      transition: { duration: 0.6, ease: [0.2, 0.6, 0.2, 1] }, // easing iz tokens.js
    },
    side: (distance) => ({
      x: distance * 320, // Razmak između kartica
      scale: 0.85,
      opacity: 0.5,
      filter: "blur(3px) grayscale(60%) brightness(0.8)", // Blur, desaturacija i zatamnjenje
      zIndex: 5,
      rotateY: distance > 0 ? -25 : 25, // 3D efekt (Paralaksa unutar karusela)
      transition: { duration: 0.6, ease: [0.2, 0.6, 0.2, 1] },
    }),
  };

  return (
    <motion.div
      className="absolute cursor-grab"
      style={{ perspective: 1200 }} // Dodajemo perspektivu za 3D rotaciju
      initial={false}
      animate={isActive ? "center" : "side"}
      custom={distance}
      variants={variants}
      onClick={() => setActiveIndex(index)}
      // Omogući drag samo za aktivnu karticu
      drag={isActive}
      dragConstraints={{ top: -50, left: -100, right: 100, bottom: 50 }}
      dragElastic={0.2}
      dragMomentum={false}
      dragSnapToOrigin={true}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      onDragStart={() => {
        // Dodajemo globalnu klasu da signaliziramo aktivan drag
        document.body.classList.add('app-dragging');
      }}
      onDragEnd={() => {
        document.body.classList.remove('app-dragging');
      }}
      whileTap={isActive ? { cursor: "grabbing" } : {}}
      whileDrag={{ scale: 1.05, zIndex: 50 }}
    >
      <div className="w-96 h-64 panel l-card p-6 shadow-2xl flex flex-col select-none">
        <div className="flex items-center mb-4">
          <FileText className="text-accent mr-3" size={28} />
          <h3 className="text-theme-heading font-semibold truncate text-lg">{doc.name}</h3>
        </div>
        <p className="text-theme-subtle text-sm flex-1 overflow-hidden mb-4">
          {doc.summary}
        </p>
        {isActive && (
            <div className='flex justify-between items-center fade-in-up'>
                <p className='text-xs text-theme-subtle opacity-70'>Povucite za dodjelu ili koristite glas.</p>
                <button className='l-btn l-btn--subtle l-btn--outline text-sm'>
                    <MessageSquare size={16} className='mr-1'/> Chat
                </button>
            </div>
        )}
      </div>
    </motion.div>
  );
};

const DocumentCarousel = ({ documents, activeIndex, setActiveIndex }) => {
    const next = () => setActiveIndex((prev) => Math.min(documents.length - 1, prev + 1));
    const prev = () => setActiveIndex((prev) => Math.max(0, prev - 1));

  return (
    // Centriranje karusela
    <div className="relative flex justify-center items-center h-full w-full">
      {documents.map((doc, index) => (
        <CarouselItem
          key={doc.id}
          doc={doc}
          index={index}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
        />
      ))}

        <button onClick={prev} disabled={activeIndex === 0} className="l-btn l-btn--outline absolute left-4 z-20 p-3 rounded-full disabled:opacity-40 shadow-md">
            <ArrowLeft />
        </button>
        <button onClick={next} disabled={activeIndex === documents.length - 1} className="l-btn l-btn--outline absolute right-4 z-20 p-3 rounded-full disabled:opacity-40 shadow-md">
            <ArrowRight />
        </button>
    </div>
  );
};

export default DocumentCarousel;