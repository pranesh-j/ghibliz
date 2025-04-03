// src/components/loading-screen.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  show: boolean;
}

export function LoadingScreen({ show }: LoadingScreenProps) {
  const [dots, setDots] = useState('');
  
  // Animated dots logic
  useEffect(() => {
    if (!show) return;
    
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 400);
    
    return () => clearInterval(interval);
  }, [show]);
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center z-50"
        >
          <div className="w-28 h-28 rounded-2xl overflow-hidden mb-6 shadow-xl">
            <img 
              src="/ghiblit-landscape.jpg" 
              alt="Ghiblit" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-4xl font-playfair font-semibold text-amber-50 mb-4">
              Ghiblit
            </h1>
            <p className="text-amber-100/80 text-lg">
              Loading<span className="inline-block w-12 text-left">{dots}</span>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}