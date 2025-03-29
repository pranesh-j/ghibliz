"use client"

import { useState, useRef } from "react"
import { motion } from "framer-motion"
import { Upload, Download, Share2, Loader2, LogIn, UserPlus, ArrowRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CloudBackground } from "@/components/cloud-background"
import { LoginModal } from "@/components/login-modal"
import { SignupModal } from "@/components/signup-modal"
import { GhibliLogo } from "@/components/ghibli-logo"

export default function Home() {
  const [selectedImage, setSelectedImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const fileInputRef = useRef(null)

  // Sample recent works data for both rows
  const recentWorks = [
    {
      id: 1,
      original: "/api/placeholder/400/300",
      processed: "/api/placeholder/400/300",
    },
    {
      id: 2,
      original: "/api/placeholder/400/300",
      processed: "/api/placeholder/400/300",
    },
    {
      id: 3,
      original: "/api/placeholder/400/300",
      processed: "/api/placeholder/400/300",
    },
    {
      id: 4,
      original: "/api/placeholder/400/300",
      processed: "/api/placeholder/400/300",
    },
    {
      id: 5,
      original: "/api/placeholder/400/300",
      processed: "/api/placeholder/400/300",
    },
    {
      id: 6,
      original: "/api/placeholder/400/300",
      processed: "/api/placeholder/400/300",
    },
  ]

  const handleImageUpload = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedImage(reader.result)
        // Simulate AI processing
        setIsProcessing(true)
        setTimeout(() => {
          setProcessedImage("/api/placeholder/400/300")
          setIsProcessing(false)
        }, 2000)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setProcessedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      {/* Cloud Background */}
      <CloudBackground />

      {/* Content Container */}
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="pt-3 sm:pt-4 px-3 md:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            {/* Logo */}
            <GhibliLogo />

            <div className="flex gap-2 sm:gap-3">
              <Button 
                className="bg-transparent text-ghibli-dark border border-ghibli-dark/70 hover:bg-ghibli-dark/5 transition-colors flex items-center text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2"
                onClick={() => setLoginOpen(true)}
              >
                <LogIn className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Sign in
              </Button>
              <Button 
                className="bg-amber-50 text-ghibli-dark hover:bg-amber-100 transition-colors flex items-center text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2"
                onClick={() => setSignupOpen(true)}
              >
                <UserPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Sign up
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section - More compact */}
        <section className="pt-3 sm:pt-8 pb-8 sm:pb-16 px-3 sm:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-playfair text-ghibli-dark mb-1 sm:mb-3 leading-tight">
              Turn photos into Ghibli art
            </h1>
            <p className="text-sm sm:text-lg font-playfair text-ghibli-dark/80 mb-4 sm:mb-8 px-2">
              AI-powered tool to transform ordinary photos into Studio Ghibli style artwork
            </p>

            {/* Upload/Processing Area - More compact */}
            {!selectedImage ? (
              <div className="p-4 sm:p-6 md:p-10 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl max-w-3xl mx-auto mt-2 sm:mt-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="cursor-pointer block border-2 border-dashed border-blue-300 rounded-2xl p-4 sm:p-8 text-center hover:border-blue-400 transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3 sm:mb-4">
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-playfair text-gray-800 mb-1 sm:mb-2">Begin your artistic journey</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Upload JPG or PNG images</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl max-w-3xl mx-auto">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-playfair text-gray-800">Your transformation</h3>
                  <button
                    onClick={handleReset}
                    className="text-gray-600 hover:text-gray-800 px-2 py-1 rounded flex items-center text-xs sm:text-sm"
                  >
                    <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    New image
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Original Image */}
                  <div>
                    <p className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-600">Original</p>
                    <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3]">
                      <img
                        src={selectedImage}
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Processed Image */}
                  <div>
                    <p className="text-xs sm:text-sm font-medium mb-1 sm:mb-2 text-gray-600">Ghiblified</p>
                    <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3]">
                      {isProcessing ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500 animate-spin mx-auto mb-2 sm:mb-3" />
                            <p className="text-xs sm:text-sm text-gray-600">Creating magic...</p>
                          </div>
                        </div>
                      ) : (
                        processedImage && (
                          <img
                            src={processedImage}
                            alt="Processed"
                            className="w-full h-full object-cover"
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {processedImage && !isProcessing && (
                  <div className="flex justify-center gap-3 sm:gap-4 mt-4 sm:mt-6">
                    <button className="bg-blue-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md flex items-center hover:bg-blue-600 transition-colors text-sm">
                      <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Download
                    </button>
                    <button className="border border-blue-500 text-blue-500 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md flex items-center hover:bg-blue-50 transition-colors text-sm">
                      <Share2 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Share
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Recent Creations Section - with scrolling gallery */}
        <section className="py-6 sm:py-10 px-3 sm:px-8 bg-amber-50/70">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-playfair text-ghibli-dark text-center mb-4 sm:mb-8">Recent Creations</h2>

            {/* Scrolling Gallery - Top row scrolling left */}
            <div className="relative w-full overflow-hidden mb-3 sm:mb-4">
              <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-r from-amber-50/70 to-transparent pointer-events-none" />
              
              <motion.div
                className="flex gap-3 sm:gap-4"
                initial={{ x: 0 }}
                animate={{ x: "-50%" }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear",
                  repeatType: "loop",
                }}
                style={{ width: "200%" }}
              >
                {/* Double the items for seamless looping */}
                {[...recentWorks, ...recentWorks].map((item, index) => (
                  <div
                    key={`top-${item.id}-${index}`}
                    className="shrink-0 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow w-40 sm:w-60"
                  >
                    <div className="aspect-[4/3] relative">
                      <img
                        src={item.original}
                        alt={`Creation ${item.id}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </motion.div>

              <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-amber-50/70 to-transparent pointer-events-none" />
            </div>

            {/* Bottom row scrolling right */}
            <div className="relative w-full overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-r from-amber-50/70 to-transparent pointer-events-none" />

              <motion.div
                className="flex gap-3 sm:gap-4"
                initial={{ x: "-50%" }}
                animate={{ x: "0%" }}
                transition={{
                  duration: 30,
                  repeat: Infinity,
                  ease: "linear",
                  repeatType: "loop",
                }}
                style={{ width: "200%" }}
              >
                {/* Double the items for seamless looping */}
                {[...recentWorks, ...recentWorks].map((item, index) => (
                  <div
                    key={`bottom-${item.id}-${index}`}
                    className="shrink-0 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow w-40 sm:w-60"
                  >
                    <div className="aspect-[4/3] relative">
                      <img
                        src={item.processed}
                        alt={`Creation ${item.id}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                ))}
              </motion.div>

              <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-amber-50/70 to-transparent pointer-events-none" />
            </div>

            <div className="text-center mt-4 sm:mt-8">
              <button className="bg-ghibli-dark text-amber-50 px-3 sm:px-5 py-1.5 sm:py-2 rounded-md flex text-sm items-center mx-auto hover:bg-ghibli-dark/90 transition-colors">
                View more creations
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Modals */}
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
        <SignupModal open={signupOpen} onOpenChange={setSignupOpen} />
      </div>
    </main>
  )
}