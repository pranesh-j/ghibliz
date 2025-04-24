import React, { useEffect, useState, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import ImageService, { RecentImage } from '@/services/imageService';
import { Loader2 } from 'lucide-react';

const IMAGE_REFRESH_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

export default function InfiniteScrollGallery() {
  const [images, setImages] = useState<RecentImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const upperRowRef = useRef<HTMLDivElement>(null);
  const lowerRowRef = useRef<HTMLDivElement>(null);
  const lastRefreshRef = useRef<number>(Date.now());

  // Use intersection observer to reduce animations when not visible
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const newVisibility = entries[0].isIntersecting;
        setIsVisible(newVisibility);
        
        // Directly manage animation state for better performance
        if (upperRowRef.current && lowerRowRef.current) {
          const playState = newVisibility ? 'running' : 'paused';
          upperRowRef.current.style.animationPlayState = playState;
          lowerRowRef.current.style.animationPlayState = playState;
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      
      // Fetch 12 images for the gallery
      const data = await ImageService.getRecentImages(12);
      
      if (data.length === 0) {
        setImages([
          { id: 1, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 2, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 3, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 4, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 5, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 6, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 7, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 8, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 9, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 10, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 11, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
          { id: 12, original: "/api/placeholder/400/300", processed: "/api/placeholder/400/300" },
        ]);
      } else {
        // Store the fetched images
        setImages(data);
      }
      
      // Update last refresh timestamp
      lastRefreshRef.current = Date.now();
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to fetch images initially and set up periodic refresh
  useEffect(() => {
    fetchImages();
    
    // Set up periodic refresh every 6 hours
    const periodicRefresh = setInterval(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current >= IMAGE_REFRESH_INTERVAL) {
        console.log('Scheduled gallery refresh');
        fetchImages();
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(periodicRefresh);
  }, []);

  // Add custom styles for optimized hover effects
  const hoverStyles = `
    @media (prefers-reduced-motion: no-preference) {
      .gallery-item {
        transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
      }
      .gallery-item:hover {
        transform: scale(1.05);
        border-color: #FFF6C8;
        box-shadow: 0 4px 12px rgba(90, 74, 63, 0.15);
        z-index: 10;
      }
    }
  `;

  if (loading && images.length === 0) {
    return (
      <div className="w-full py-8">
        <h2 className="text-center text-xl font-bold mb-4">Recent Creations</h2>
        <div className="flex justify-center p-4">
          <Loader2 className="w-8 h-8 text-ghibli-dark/70 animate-spin" />
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="w-full py-8">
        <h2 className="text-center text-xl font-bold mb-4">Recent Creations</h2>
        <p className="text-center text-gray-500">No images available yet</p>
      </div>
    );
  }

  // Split images into two rows of 6 each
  const firstRowImages = images.slice(0, 6);
  const secondRowImages = images.slice(6, 12);
  
  // For animation, we duplicate each set
  const duplicatedFirstRow = [...firstRowImages, ...firstRowImages];
  const duplicatedSecondRow = [...secondRowImages, ...secondRowImages];

  return (
    <div ref={containerRef} className="w-full overflow-hidden py-4 sm:py-6 px-3 sm:px-8 bg-amber-50/70">
      <style>{hoverStyles}</style>
      <h2 className="text-xl sm:text-2xl font-playfair text-ghibli-dark text-center mb-3 sm:mb-5">Recent Creations</h2>
      
      <div className="max-w-7xl mx-auto">
        <div className="relative w-full overflow-hidden mb-3 sm:mb-4">
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-r from-amber-50/70 to-transparent pointer-events-none" />
          <motion.div 
            ref={upperRowRef}
            className="flex gap-3 sm:gap-4"
            initial={{ x: 0 }} 
            animate={{ x: "-50%" }}
            transition={{ 
              duration: 45, 
              repeat: Infinity, 
              ease: "linear", 
              repeatType: "loop" 
            }}
            style={{ 
              width: "200%",
              willChange: "transform",
              backfaceVisibility: "hidden",
              transform: "translateZ(0)",
            }}
          >
            {duplicatedFirstRow.map((image, index) => (
              <div 
                key={`upper-${image.id}-${index}`} 
                className="shrink-0 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow w-40 sm:w-60 gallery-item border-2 border-transparent"
              >
                <div className="aspect-[4/3] relative">
                  <img 
                    src={image.original || "/api/placeholder/400/300"} 
                    alt={`Original image ${image.id}`} 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                    decoding="async"
                    onError={(e) => e.currentTarget.src = "/api/placeholder/400/300"}
                  />
                </div>
              </div>
            ))}
          </motion.div>
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-amber-50/70 to-transparent pointer-events-none" />
        </div>
        
        <div className="relative w-full overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-r from-amber-50/70 to-transparent pointer-events-none" />
          <motion.div 
            ref={lowerRowRef}
            className="flex gap-3 sm:gap-4"
            initial={{ x: "-50%" }} 
            animate={{ x: "0%" }}
            transition={{ 
              duration: 45, 
              repeat: Infinity, 
              ease: "linear", 
              repeatType: "loop"
            }}
            style={{ 
              width: "200%",
              willChange: "transform",
              backfaceVisibility: "hidden",
              transform: "translateZ(0)",
            }}
          >
            {duplicatedSecondRow.map((image, index) => (
              <div 
                key={`lower-${image.id}-${index}`} 
                className="shrink-0 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow w-40 sm:w-60 gallery-item border-2 border-transparent"
              >
                <div className="aspect-[4/3] relative">
                  <img 
                    src={image.processed || "/api/placeholder/400/300"} 
                    alt={`Processed image ${image.id}`} 
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => e.currentTarget.src = "/api/placeholder/400/300"}
                  />
                </div>
              </div>
            ))}
          </motion.div>
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-amber-50/70 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}