import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  show: boolean;
}

export function LoadingScreen({ show }: LoadingScreenProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 bg-[#B0E0E6]/80 backdrop-blur-sm flex flex-col items-center justify-center z-[9999]"
        >
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#87CEEB] to-[#B0E0E6]">

              <div className="absolute top-[10%] left-[5%] w-32 h-20 bg-white/80 rounded-full blur-md"></div>
              <div className="absolute top-[25%] left-[25%] w-40 h-24 bg-white/80 rounded-full blur-md"></div>
              <div className="absolute top-[15%] left-[60%] w-36 h-20 bg-white/80 rounded-full blur-md"></div>
              <div className="absolute top-[40%] left-[75%] w-32 h-20 bg-white/80 rounded-full blur-md"></div>
              <div className="absolute top-[60%] left-[15%] w-40 h-24 bg-white/80 rounded-full blur-md"></div>
              <div className="absolute top-[65%] left-[55%] w-36 h-20 bg-white/80 rounded-full blur-md"></div>
            </div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center">

            <div className="w-16 h-16 rounded-xl overflow-hidden mb-6 shadow-lg">
              <img 
                src="/ghiblit.png" 
                alt="Ghiblit" 
                className="w-full h-full object-cover"
              />
            </div>
            
            
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}