import React, { useEffect, useState, memo } from 'react';
import { imageService } from '@/services/imageService';

// Memoized image component to prevent unnecessary re-renders
const GalleryImage = memo(({ src, alt }: { src: string; alt: string }) => (
  <div className="relative aspect-square overflow-hidden rounded-md">
    <img 
      src={src} 
      alt={alt}
      className="object-cover w-full h-full transition-transform hover:scale-105"
      loading="lazy" /* Add lazy loading */
    />
  </div>
));

GalleryImage.displayName = 'GalleryImage';

export default function InfiniteScrollGallery() {
  const [images, setImages] = useState<{ original: string; processed: string; id: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        // Fetch exactly 20 images at once instead of multiple small fetches
        const data = await imageService.getRecentImages(20);
        setImages(data);
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-4">Loading gallery...</div>;
  }

  // Split images into two rows for the marquee effect
  const upperRowImages = [...images.slice(0, 10), ...images.slice(0, 10)]; // Duplicate first 10 to create loop
  const lowerRowImages = [...images.slice(10, 20), ...images.slice(10, 20)]; // Duplicate last 10 to create loop

  return (
    <div className="w-full overflow-hidden py-8">
      <h2 className="text-center text-xl font-bold mb-4">Latest Transformations</h2>
      
      {/* Upper row - moves left */}
      <div className="relative w-full overflow-hidden mb-4">
        <div className="flex animate-marquee">
          {upperRowImages.map((image, index) => (
            <div key={`upper-${image.id}-${index}`} className="w-64 flex-shrink-0 p-2">
              <GalleryImage src={image.processed} alt="Transformed image" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Lower row - moves right */}
      <div className="relative w-full overflow-hidden">
        <div className="flex animate-marquee-reverse">
          {lowerRowImages.map((image, index) => (
            <div key={`lower-${image.id}-${index}`} className="w-64 flex-shrink-0 p-2">
              <GalleryImage src={image.processed} alt="Transformed image" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}