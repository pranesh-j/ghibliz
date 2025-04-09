// src/lib/cache-utils.ts
// Helper functions for caching themes and assets

/**
 * Preload crucial theme assets to ensure faster loading
 */
export const preloadThemeAssets = () => {
    try {
      // List of key assets to preload
      const assetsToPreload = [
        '/ghiblit-logo.jpg',
        '/ghiblit-landscape.jpg',
        // Add style icons
        '/style-icons/ghibli.png',
        '/style-icons/onepiece.png',
        '/style-icons/cyberpunk.png',
        '/style-icons/shinchan.png',
        '/style-icons/solo.png',
        '/style-icons/pixar.png',
        '/style-icons/dragonball.png',
        '/style-icons/manga.png',
        '/style-icons/minecraft.png',
      ];
  
      // Create link elements for preloading
      assetsToPreload.forEach(asset => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = asset;
        document.head.appendChild(link);
      });
  
      // For browsers that support it, use the Cache API
      if ('caches' in window) {
        caches.open('ghiblit-theme-assets').then(cache => {
          cache.addAll(assetsToPreload).catch(err => {
            console.log('Cache API error (non-critical):', err);
          });
        });
      }
    } catch (error) {
      // Non-critical error, just log and continue
      console.log('Asset preloading error (non-critical):', error);
    }
  };
  
  /**
   * Apply performance optimizations for smoother animations
   */
  export const optimizeForAnimation = () => {
    try {
      // Add hint to browser that animations will happen
      document.documentElement.classList.add('will-change-transform');
      
      // Create an invisible div that hints at cloud animation
      const animationHint = document.createElement('div');
      animationHint.style.position = 'fixed';
      animationHint.style.top = '0';
      animationHint.style.left = '0';
      animationHint.style.width = '1px';
      animationHint.style.height = '1px';
      animationHint.style.opacity = '0.01';
      animationHint.style.willChange = 'transform';
      animationHint.style.zIndex = '-9999';
      document.body.appendChild(animationHint);
      
      // Cleanup hint after page is fully loaded
      window.addEventListener('load', () => {
        setTimeout(() => {
          document.documentElement.classList.remove('will-change-transform');
        }, 5000); // Remove after 5 seconds to not overuse will-change
      });
    } catch (error) {
      // Non-critical error, just log and continue
      console.log('Animation optimization error (non-critical):', error);
    }
  };
  
  /**
   * Initialize all caching and performance optimizations
   */
  export const initializeOptimizations = () => {
    preloadThemeAssets();
    optimizeForAnimation();
  };