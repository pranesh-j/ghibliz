"use client"

import type { ReactNode } from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { Playfair_Display, Inter } from "next/font/google"
import { usePathname, useSearchParams } from "next/navigation"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/components/ui/toast"
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LoadingScreen } from "@/components/loading-screen"
import { initializeOptimizations } from "@/lib/cache-utils"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const [loading, setLoading] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get Google Client ID from environment variable
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  // Anti-flash loading system
  const handleLoading = useCallback(() => {
    // Reset states for new loading cycle
    setLoading(true);
    setContentVisible(false);
    
    // Clear any existing timers
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    
    // Function to mark content as ready with forced delay
    const markContentReady = () => {
      // First make content ready but still invisible (pre-render)
      document.body.classList.add('loading-transition');
      
      // Wait for browser to paint and process before starting transition
      loadingTimerRef.current = setTimeout(() => {
        // Then allow content to be visible
        setContentVisible(true);
        
        // Wait for content to be visible before starting to hide loader
        loadingTimerRef.current = setTimeout(() => {
          // Only now start hiding the loading screen
          setLoading(false);
          
          // Remove transition class after everything is complete
          loadingTimerRef.current = setTimeout(() => {
            document.body.classList.remove('loading-transition');
          }, 1000);
        }, 800); // Longer delay (800ms) before hiding loading screen
      }, 200);
    };
    
    // Check image loading with a more robust approach
    const checkImagesLoaded = () => {
      const images = document.querySelectorAll('img');
      const totalImages = images.length;
      let loadedImages = 0;
      
      // No images or very few images case
      if (totalImages <= 3) {
        // Wait a bit longer to ensure everything is rendered
        loadingTimerRef.current = setTimeout(markContentReady, 600);
        return;
      }
      
      // For each image, check if loaded
      images.forEach(img => {
        if (img.complete) {
          loadedImages++;
        } else {
          img.addEventListener('load', () => {
            loadedImages++;
            if (loadedImages >= totalImages - 2) { // Allow 2 images to fail
              markContentReady();
            }
          });
          
          // Also handle error case
          img.addEventListener('error', () => {
            loadedImages++;
            if (loadedImages >= totalImages - 2) { // Allow 2 images to fail
              markContentReady();
            }
          });
        }
      });
      
      // If all images are already loaded
      if (loadedImages >= totalImages - 2) {
        markContentReady();
      }
    };
    
    // Start checking when document is at least interactive
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      loadingTimerRef.current = setTimeout(checkImagesLoaded, 300);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        loadingTimerRef.current = setTimeout(checkImagesLoaded, 300);
      }, { once: true });
    }
    
    // Final fallback - maximum wait time
    loadingTimerRef.current = setTimeout(() => {
      markContentReady();
    }, 5000); // Maximum 5 seconds wait
    
  }, []);
  
  // Initialize caching and performance optimizations
  useEffect(() => {
    initializeOptimizations();
    
    // Add anti-flash styles
    const style = document.createElement('style');
    style.innerHTML = `
      .loading-transition * {
        transition: none !important;
      }
      
      body {
        overflow: ${loading ? 'hidden' : 'auto'};
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [loading]);
  
  // Initial loading when the app first loads
  useEffect(() => {
    handleLoading();
    
    // Clean-up function
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [handleLoading]);
  
  // Show loading screen on route changes
  useEffect(() => {
    handleLoading();
  }, [pathname, searchParams, handleLoading]);
  
  return (
    <html lang="en">
      <head>
        {/* Preload critical assets */}
        <link rel="preload" href="/ghiblit-logo.jpg" as="image" />
        <style>{`
          /* Anti-flash style */
          .content-container { 
            transition: opacity 0.8s ease-in-out;
            will-change: opacity;
          }
          
          /* Override default transition to prevent flash */
          .initial-load * { 
            transition: none !important; 
          }
        `}</style>
      </head>
      <body className={`${inter.className} ${playfair.variable} ${loading ? 'initial-load' : ''} overflow-x-hidden`}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <AuthProvider>
              <ToastProvider>
                {/* Always render the loading screen with very high z-index */}
                <LoadingScreen show={loading} />
                
                {/* Content container with improved opacity control */}
                <div 
                  className="content-container"
                  style={{
                    opacity: contentVisible ? 1 : 0,
                    visibility: contentVisible ? 'visible' : 'hidden',
                    pointerEvents: contentVisible && !loading ? 'auto' : 'none',
                  }}
                >
                  {children}
                </div>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}