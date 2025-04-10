// src/lib/cache-utils.ts
import { cleanupUnusedResources } from './memory-utils';

export const preloadThemeAssets = () => {
  try {
    const assetsToPreload = [
      '/ghiblit.webp',
      '/style-icons/ghibli.webp',
      '/style-icons/onepiece.webp',
      '/style-icons/cyberpunk.webp',
      '/style-icons/shinchan.webp',
      '/style-icons/solo.webp',
      '/style-icons/pixar.webp',
      '/style-icons/dragonball.webp',
      '/style-icons/manga.webp',
      '/style-icons/minecraft.webp',
    ];

    // Use a more efficient preloading method
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        assetsToPreload.forEach(asset => {
          const img = new Image();
          img.src = asset;
          // Use decode if available for smoother loading
          if ('decode' in img) {
            img.decode().catch(() => {});
          }
        });
      });
    } else {
      // Fallback
      setTimeout(() => {
        assetsToPreload.forEach(asset => {
          const img = new Image();
          img.src = asset;
        });
      }, 300);
    }

    // Use Cache API if available
    if ('caches' in window) {
      caches.open('ghiblit-theme-assets').then(cache => {
        // Check which assets are already cached before adding
        Promise.all(
          assetsToPreload.map(url => 
            cache.match(url).then(match => ({ url, cached: !!match }))
          )
        ).then(results => {
          // Only fetch assets not already in cache
          const uncachedAssets = results
            .filter(result => !result.cached)
            .map(result => result.url);
            
          if (uncachedAssets.length > 0) {
            cache.addAll(uncachedAssets).catch(err => {
              console.log('Cache API error (non-critical):', err);
            });
          }
        });
      });
    }
  } catch (error) {
    console.log('Asset preloading error (non-critical):', error);
  }
};

export const optimizeForAnimation = () => {
  try {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Skip animation optimizations if user prefers reduced motion
    if (prefersReducedMotion) {
      document.documentElement.classList.add('reduced-motion');
      return;
    }
    
    document.documentElement.classList.add('will-change-transform');
    
    // Apply hardware acceleration hints to critical elements
    const applyHardwareAcceleration = () => {
      const animationElements = document.querySelectorAll('.animate-marquee, .animate-marquee-reverse, canvas');
      animationElements.forEach(el => {
        if (el instanceof HTMLElement) {
          el.style.transform = 'translateZ(0)';
          el.style.backfaceVisibility = 'hidden';
          el.style.willChange = 'transform';
        }
      });
    };
    
    // Run on load and after DOM changes
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyHardwareAcceleration);
    } else {
      applyHardwareAcceleration();
    }
    
    window.addEventListener('load', applyHardwareAcceleration);
    
    // Create a hint element for browser optimization
    const animationHint = document.createElement('div');
    animationHint.style.position = 'fixed';
    animationHint.style.top = '0';
    animationHint.style.left = '0';
    animationHint.style.width = '1px';
    animationHint.style.height = '1px';
    animationHint.style.opacity = '0.01';
    animationHint.style.willChange = 'transform';
    animationHint.style.zIndex = '-9999';
    
    if (document.body) {
      document.body.appendChild(animationHint);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(animationHint);
      });
    }
    
    // Optimize scrolling
    document.documentElement.classList.add('optimize-scroll');
    
    // Clean up will-change after initial rendering
    window.addEventListener('load', () => {
      setTimeout(() => {
        const elements = document.querySelectorAll('[style*="will-change"]');
        elements.forEach(el => {
          if (el instanceof HTMLElement && 
              !el.classList.contains('animate-marquee') && 
              !el.classList.contains('animate-marquee-reverse') && 
              !(el instanceof HTMLCanvasElement)) {
            el.style.willChange = 'auto';
          }
        });
      }, 5000);
    });
  } catch (error) {
    console.log('Animation optimization error (non-critical):', error);
  }
};

// Prevent layout thrashing by batching DOM reads/writes
export const optimizeLayoutOperations = () => {
  // Add IntersectionObserver polyfill if needed
  if (!('IntersectionObserver' in window)) {
    console.log('IntersectionObserver not supported');
  }
  
  // Optimize for touch devices
  if ('ontouchstart' in window) {
    document.documentElement.classList.add('touch-device');
  }
  
  // Add passive event listeners where possible
  try {
    const passiveIfSupported = Object.defineProperty({}, 'passive', {
      get: function() { return true; }
    });
    
    window.addEventListener('test', null, passiveIfSupported);
    
    // Add hints class for optimization
    document.documentElement.classList.add('passive-events-supported');
  } catch (err) { 
    console.log('Passive events not fully supported'); 
  }
};

// Register service worker for caching
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('ServiceWorker registration successful');
        })
        .catch(error => {
          console.log('ServiceWorker registration failed:', error);
        });
    });
  }
};

// Initialize optimizations
export const initializeOptimizations = () => {
  // Use requestIdleCallback for non-critical initialization when available
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      preloadThemeAssets();
    });
    
    (window as any).requestIdleCallback(() => {
      optimizeForAnimation();
    });
    
    (window as any).requestIdleCallback(() => {
      optimizeLayoutOperations();
    });
    
    // Service worker should be registered early, but not critical path
    (window as any).requestIdleCallback(() => {
      registerServiceWorker();
    });
    
    // Memory management
    (window as any).requestIdleCallback(() => {
      cleanupUnusedResources();
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      preloadThemeAssets();
    }, 100);
    
    setTimeout(() => {
      optimizeForAnimation();
    }, 200);
    
    setTimeout(() => {
      optimizeLayoutOperations();
    }, 300);
    
    setTimeout(() => {
      registerServiceWorker();
    }, 400);
    
    setTimeout(() => {
      cleanupUnusedResources();
    }, 500);
  }
};