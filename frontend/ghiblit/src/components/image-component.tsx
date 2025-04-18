// src/components/image-component.tsx (new file)
import { useState, useEffect, useRef, memo } from 'react'

interface ImageProps {
  src: string
  alt: string
  className?: string
  width?: number
  height?: number
  onLoad?: () => void
}

// Optimized image component with proper loading
export const OptimizedImage = memo(({ 
  src, 
  alt, 
  className = "", 
  width, 
  height,
  onLoad 
}: ImageProps) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const isMounted = useRef(true)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const placeholderColor = 'bg-gray-100'
  
  // Add support for image decode API for smoother loading
  useEffect(() => {
    if (imgRef.current) {
      // Modern browsers with decode support
      if (typeof imgRef.current.decode === 'function') {
        imgRef.current.decode()
          .then(() => {
            if (isMounted.current) {
              setLoading(false)
              if (onLoad) onLoad()
            }
          })
          .catch(() => {
            if (isMounted.current) {
              setError(true)
              setLoading(false)
            }
          })
      } else {
        // Fallback for browsers without decode support
        const handleLoad = () => {
          if (isMounted.current) {
            setLoading(false)
            if (onLoad) onLoad()
          }
        }

        const handleError = () => {
          if (isMounted.current) {
            setError(true)
            setLoading(false)
          }
        }

        imgRef.current.addEventListener('load', handleLoad)
        imgRef.current.addEventListener('error', handleError)

        // Clean up event listeners
        return () => {
          imgRef.current?.removeEventListener('load', handleLoad)
          imgRef.current?.removeEventListener('error', handleError)
        }
      }
    }
  }, [src, onLoad])
  
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ 
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : '100%'
      }}
    >
      {loading && (
        <div className={`absolute inset-0 ${placeholderColor} animate-pulse`} />
      )}
      
      {error ? (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <span className="text-xs text-gray-500">Image failed to load</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'