// src/components/infinite-scroll-gallery.tsx
import React, { useEffect, useState, useRef, memo } from 'react';
import ImageService, { RecentImage } from '@/services/imageService';
import { OptimizedImage } from './image-component';

// Use IntersectionObserver to only animate when visible
export default function InfiniteScrollGallery() {
  const [images, setImages] = useState<RecentImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const upperRowRef = useRef<HTMLDivElement>(null);
  const lowerRowRef = useRef<HTMLDivElement>(null);
  
  // Use intersection observer to reduce animations when not visible
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const data = await ImageService.getRecentImages(20);
        setImages(data);
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Apply proper GPU acceleration to the animation
  useEffect(() => {
    if (!upperRowRef.current || !lowerRowRef.current) return;
    
    // Pause animations when not visible for performance
    if (isVisible) {
      upperRowRef.current.style.animationPlayState = 'running';
      lowerRowRef.current.style.animationPlayState = 'running';
    } else {
      upperRowRef.current.style.animationPlayState = 'paused';
      lowerRowRef.current.style.animationPlayState = 'paused';
    }
  }, [isVisible]);

  if (loading) {
    return <div className="flex justify-center p-4">Loading gallery...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="w-full py-8">
        <h2 className="text-center text-xl font-bold mb-4">Latest Transformations</h2>
        <p className="text-center text-gray-500">No images available yet</p>
      </div>
    );
  }

  // Only duplicate minimum necessary images
  const upperRowImages = [...images.slice(0, 10), ...images.slice(0, 10)];
  const lowerRowImages = [...images.slice(10, 20), ...images.slice(10, 20)];

  return (
    <div ref={containerRef} className="w-full overflow-hidden py-8">
      <h2 className="text-center text-xl font-bold mb-4">Latest Transformations</h2>
      
      <div className="relative w-full overflow-hidden mb-4">
        <div 
          ref={upperRowRef}
          className="flex animate-marquee"
          style={{ 
            width: '200%',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          {upperRowImages.map((image, index) => (
            image.processed && (
              <div key={`upper-${image.id}-${index}`} className="w-64 flex-shrink-0 p-2">
                <OptimizedImage 
                  src={image.processed} 
                  alt="Transformed image" 
                  className="aspect-square rounded-md overflow-hidden"
                />
              </div>
            )
          ))}
        </div>
      </div>
      
      <div className="relative w-full overflow-hidden">
        <div 
          ref={lowerRowRef}
          className="flex animate-marquee-reverse"
          style={{ 
            width: '200%',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            transform: 'translateZ(0)',
          }}
        >
          {lowerRowImages.map((image, index) => (
            image.processed && (
              <div key={`lower-${image.id}-${index}`} className="w-64 flex-shrink-0 p-2">
                <OptimizedImage 
                  src={image.processed} 
                  alt="Transformed image"
                  className="aspect-square rounded-md overflow-hidden"
                />
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}