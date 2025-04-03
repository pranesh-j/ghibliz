"use client"

import type { ReactNode } from "react"
import { useState, useEffect } from "react"
import { Playfair_Display, Inter } from "next/font/google"
import { usePathname, useSearchParams } from "next/navigation"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastProvider } from "@/components/ui/toast"
import { GoogleOAuthProvider } from '@react-oauth/google'
import { LoadingScreen } from "@/components/loading-screen"

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Get Google Client ID from environment variable
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  
  // Initial loading when the app first loads
  useEffect(() => {
    // Hide loading screen after app is loaded
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500); // 1.5 seconds for initial load
    
    return () => clearTimeout(timer);
  }, []);
  
  // Show loading screen on route changes
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800); // 800ms for navigation between pages
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);
  
  return (
    <html lang="en">
      <body className={`${inter.className} ${playfair.variable}`}>
        <GoogleOAuthProvider clientId={googleClientId}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <AuthProvider>
              <ToastProvider>
                <LoadingScreen show={loading} />
                {children}
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}