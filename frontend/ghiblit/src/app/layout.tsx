"use client"

import type { ReactNode } from "react"
import { useState, useEffect, useCallback, useRef, Suspense } from "react"
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

// Separate component that uses useSearchParams
function LayoutContent({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const handleLoading = useCallback(() => {
    setLoading(true);
    setContentVisible(false);
    
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    
    const markContentReady = () => {
      document.body.classList.add('loading-transition');
      
      loadingTimerRef.current = setTimeout(() => {
        setContentVisible(true);
        
        loadingTimerRef.current = setTimeout(() => {
          setLoading(false);
          
          loadingTimerRef.current = setTimeout(() => {
            document.body.classList.remove('loading-transition');
          }, 1000);
        }, 800);
      }, 200);
    };
    
    const checkImagesLoaded = () => {
      const images = document.querySelectorAll('img');
      const totalImages = images.length;
      let loadedImages = 0;
      
      if (totalImages <= 3) {
        loadingTimerRef.current = setTimeout(markContentReady, 600);
        return;
      }
      
      images.forEach(img => {
        if (img.complete) {
          loadedImages++;
        } else {
          img.addEventListener('load', () => {
            loadedImages++;
            if (loadedImages >= totalImages - 2) {
              markContentReady();
            }
          });
          
          img.addEventListener('error', () => {
            loadedImages++;
            if (loadedImages >= totalImages - 2) {
              markContentReady();
            }
          });
        }
      });
      
      if (loadedImages >= totalImages - 2) {
        markContentReady();
      }
    };
    
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      loadingTimerRef.current = setTimeout(checkImagesLoaded, 300);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        loadingTimerRef.current = setTimeout(checkImagesLoaded, 300);
      }, { once: true });
    }
    
    loadingTimerRef.current = setTimeout(() => {
      markContentReady();
    }, 5000);
  }, []);
  
  useEffect(() => {
    initializeOptimizations();
    
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
  
  useEffect(() => {
    handleLoading();
    
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [handleLoading]);
  
  useEffect(() => {
    handleLoading();
  }, [pathname, searchParams, handleLoading]);
  
  return (
    <>
      <LoadingScreen show={loading} />
      
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
    </>
  );
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/ghiblit-logo.jpg" as="image" />
        <style>{`
          .content-container { 
            transition: opacity 0.8s ease-in-out;
            will-change: opacity;
          }
          
          .initial-load * { 
            transition: none !important; 
          }
        `}</style>
      </head>
      <body className={`${inter.className} ${playfair.variable} overflow-x-hidden`}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <AuthProvider>
              <ToastProvider>
                <Suspense fallback={<div>Loading...</div>}>
                  <LayoutContent>
                    {children}
                  </LayoutContent>
                </Suspense>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}