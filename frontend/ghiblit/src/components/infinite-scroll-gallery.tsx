import React, { useEffect, useState, memo } from 'react';
import ImageService, { RecentImage } from '@/services/imageService';

const GalleryImage = memo(({ src, alt }: { src: string; alt: string }) => (
  <div className="relative aspect-square overflow-hidden rounded-md">
    <img 
      src={src} 
      alt={alt}
      className="object-cover w-full h-full transition-transform hover:scale-105"
      loading="lazy"
    />
  </div>
));

GalleryImage.displayName = 'GalleryImage';

export default function InfiniteScrollGallery() {
  const [images, setImages] = useState<RecentImage[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="flex justify-center p-4">Loading gallery...</div>;
  }

  // Handle empty state
  if (images.length === 0) {
    return (
      <div className="w-full py-8">
        <h2 className="text-center text-xl font-bold mb-4">Latest Transformations</h2>
        <p className="text-center text-gray-500">No images available yet</p>
      </div>
    );
  }

  // Duplicate images to create infinite scrolling effect
  const upperRowImages = [...images.slice(0, 10), ...images.slice(0, 10)]; 
  const lowerRowImages = [...images.slice(10, 20), ...images.slice(10, 20)];

  return (
    <div className="w-full overflow-hidden py-8">
      <h2 className="text-center text-xl font-bold mb-4">Latest Transformations</h2>
      
      <div className="relative w-full overflow-hidden mb-4">
        <div className="flex animate-marquee">
          {upperRowImages.map((image, index) => (
            image.processed && (
              <div key={`upper-${image.id}-${index}`} className="w-64 flex-shrink-0 p-2">
                <GalleryImage src={image.processed} alt="Transformed image" />
              </div>
            )
          ))}
        </div>
      </div>
      
      <div className="relative w-full overflow-hidden">
        <div className="flex animate-marquee-reverse">
          {lowerRowImages.map((image, index) => (
            image.processed && (
              <div key={`lower-${image.id}-${index}`} className="w-64 flex-shrink-0 p-2">
                <GalleryImage src={image.processed} alt="Transformed image" />
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}