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
  
  // Add isInitialLoadRef
  const isInitialLoadRef = useRef(true);
  
  const handleLoading = useCallback(() => {
    // Skip loading animation on subsequent navigations
    if (!isInitialLoadRef.current && window.performance?.now() > 5000) {
      setLoading(false);
      setContentVisible(true);
      return;
    }
    
    setLoading(true);
    setContentVisible(false);
    
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
    }
    
    const markContentReady = () => {
      setContentVisible(true);
      
      loadingTimerRef.current = setTimeout(() => {
        setLoading(false);
        isInitialLoadRef.current = false;
      }, 300);
    };
    
    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        loadingTimerRef.current = setTimeout(markContentReady, 300);
      });
    } else {
      loadingTimerRef.current = setTimeout(markContentReady, 500);
    }
    
    // Safety timeout
    loadingTimerRef.current = setTimeout(() => {
      markContentReady();
    }, 3000);
  }, []);
  
  // Update document body class for optimization
  useEffect(() => {
    document.body.classList.add('optimize-scroll');
    document.documentElement.style.scrollBehavior = 'smooth';
    
    return () => {
      document.body.classList.remove('optimize-scroll');
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);
  
  // Only run loading effect on initial page load and real navigation events
  useEffect(() => {
    if (isInitialLoadRef.current) {
      handleLoading();
    }
    
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [handleLoading]);
  
  // Set up navigation listener
  useEffect(() => {
    const handleNavigation = () => {
      if (!isInitialLoadRef.current) {
        setContentVisible(true);
        setLoading(false);
      }
    };
    
    window.addEventListener('pageshow', handleNavigation);
    
    return () => {
      window.removeEventListener('pageshow', handleNavigation);
    };
  }, []);
  
  return (
    <>
      <LoadingScreen show={loading} />
      
      <div 
        className="content-container hardware-accelerated"
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
        <link rel="preload" href="/ghiblit.webp" as="image" />
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