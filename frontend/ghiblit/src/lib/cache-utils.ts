
export const preloadThemeAssets = () => {
    try {
      const assetsToPreload = [
        '/ghiblit.jpg',
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
  

      assetsToPreload.forEach(asset => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = asset;
        document.head.appendChild(link);
      });
  
      if ('caches' in window) {
        caches.open('ghiblit-theme-assets').then(cache => {
          cache.addAll(assetsToPreload).catch(err => {
            console.log('Cache API error (non-critical):', err);
          });
        });
      }
    } catch (error) {
      console.log('Asset preloading error (non-critical):', error);
    }
  };
  
  export const optimizeForAnimation = () => {
    try {
      document.documentElement.classList.add('will-change-transform');
      
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
      

      window.addEventListener('load', () => {
        setTimeout(() => {
          document.documentElement.classList.remove('will-change-transform');
        }, 5000); // Remove after 5 seconds to not overuse will-change
      });
    } catch (error) {

      console.log('Animation optimization error (non-critical):', error);
    }
  };
  

  export const initializeOptimizations = () => {
    preloadThemeAssets();
    optimizeForAnimation();
  };