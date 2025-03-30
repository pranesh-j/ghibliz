"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Upload, Download, Share2, Loader2, LogIn, UserPlus, ArrowRight, RefreshCw, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CloudBackground } from "@/components/cloud-background"
import { LoginModal } from "@/components/login-modal"
import { SignupModal } from "@/components/signup-modal"
import { GhibliLogo } from "@/components/ghibli-logo"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import ImageService, { RecentImage } from "@/services/imageService"

export default function Home() {
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth()
  const { toast } = useToast()
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [recentWorks, setRecentWorks] = useState<RecentImage[]>([])
  const [loadingRecentWorks, setLoadingRecentWorks] = useState(false)
  const [imageData, setImageData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch recent works on component mount
  useEffect(() => {
    const fetchRecentWorks = async () => {
      setLoadingRecentWorks(true)
      try {
        const data = await ImageService.getRecentImages(6)
        setRecentWorks(data)
      } catch (error) {
        console.error("Failed to fetch recent works:", error)
        toast({
          title: "Couldn't load gallery",
          description: "We couldn't load recent creations. Please try again later.",
          variant: "error"
        })
        
        // Set placeholder data if API fails
        setRecentWorks([
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
        ])
      } finally {
        setLoadingRecentWorks(false)
      }
    }

    fetchRecentWorks()
  }, [toast])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset states
    setProcessedImage(null)
    setImageData(null)
    
    // Display the selected image
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result)
        processImage(file)
      }
    }
    reader.readAsDataURL(file)
  }

  const processImage = async (file: File) => {
    setIsProcessing(true)
    
    try {
      // Check if user has credits if they're authenticated and have used their free transform
      if (isAuthenticated && user?.profile?.free_transform_used && user?.profile?.credit_balance <= 0) {
        toast({
          title: "No credits available",
          description: "Please purchase credits to continue transforming images",
          variant: "warning"
        })
        setIsProcessing(false)
        return
      }
      
      // Call the API to transform the image
      const response = await ImageService.transformImage(file)
      
      // Set the processed image URL and data
      setProcessedImage(response.preview_url || response.image_url)
      setImageData(response)
      
      toast({
        title: "Transformation complete!",
        description: "Your image has been Ghiblified",
        variant: "success"
      })
    } catch (error: any) {
      console.error("Image processing error:", error)
      
      let errorMessage = "Failed to process image. Please try again."
      
      // Handle specific API errors
      if (error.response?.status === 402) {
        errorMessage = "You need to purchase credits to transform more images."
        setLoginOpen(true)
      } else if (error.response?.status === 413) {
        errorMessage = "Image size is too large. Please upload a smaller image."
      } else if (error.response?.status === 415) {
        errorMessage = "Unsupported image format. Please use JPG or PNG."
      }
      
      toast({
        title: "Processing failed",
        description: errorMessage,
        variant: "error"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDownload = async () => {
    if (!imageData) return
    
    try {
      // If paid image, download the full version, otherwise use preview
      if (imageData.is_paid) {
        await ImageService.downloadAndSaveImage(imageData.id, imageData.download_token)
      } else {
        // Download the preview version
        const link = document.createElement('a')
        link.href = processedImage || ""
        link.download = `ghiblified-preview-${imageData.id || 'image'}.jpg`
        document.body.appendChild(link)
        link.click()
        link.remove()
      }
      
      toast({
        title: "Download started",
        description: imageData.is_paid ? "Downloading your full image" : "Downloading preview image",
        variant: "success"
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        title: "Download failed",
        description: "There was a problem downloading your image",
        variant: "error"
      })
    }
  }

  const handleShare = async () => {
    if (!imageData) return
    
    try {
      const response = await ImageService.shareImage(imageData.id)
      
      // Copy the share URL to clipboard
      navigator.clipboard.writeText(response.share_url)
      
      toast({
        title: "Link copied!",
        description: "Share URL copied to clipboard",
        variant: "success"
      })
    } catch (error) {
      console.error("Share error:", error)
      toast({
        title: "Share failed",
        description: "There was a problem generating a share link",
        variant: "error"
      })
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setProcessedImage(null)
    setImageData(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSwitchToLogin = () => {
    setSignupOpen(false)
    setLoginOpen(true)
  }

  const handleSwitchToSignup = () => {
    setLoginOpen(false)
    setSignupOpen(true)
  }

  const handleBuyCredits = () => {
    // Redirect to credits purchase page
    // For now, just show a toast
    toast({
      title: "Coming soon",
      description: "Credit purchases will be available soon!",
      variant: "info"
    })
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
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-ghibli-dark mr-2">
                    <span className="font-medium">{user?.username}</span>
                    {user?.profile && (
                      <div className="flex items-center gap-1">
                        <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                          {user.profile.credit_balance} credits
                        </span>
                        <Button
                          className="p-1 h-auto bg-transparent hover:bg-transparent text-blue-500"
                          onClick={handleBuyCredits}
                        >
                          <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button 
                    className="bg-transparent text-ghibli-dark border border-ghibli-dark/70 hover:bg-ghibli-dark/5 transition-colors flex items-center text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2"
                    onClick={logout}
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <>
                  <Button 
                    className="bg-transparent text-ghibli-dark border border-ghibli-dark/70 hover:bg-ghibli-dark/5 transition-colors flex items-center text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2"
                    onClick={() => setLoginOpen(true)}
                    disabled={authLoading}
                  >
                    <LogIn className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Sign in
                  </Button>
                  <Button 
                    className="bg-amber-50 text-ghibli-dark hover:bg-amber-100 transition-colors flex items-center text-sm sm:text-base px-2 sm:px-4 py-1 sm:py-2"
                    onClick={() => setSignupOpen(true)}
                    disabled={authLoading}
                  >
                    <UserPlus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    Sign up
                  </Button>
                </>
              )}
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
                    <button 
                      className="bg-blue-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md flex items-center hover:bg-blue-600 transition-colors text-sm"
                      onClick={handleDownload}
                    >
                      <Download className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Download
                    </button>
                    <button 
                      className="border border-blue-500 text-blue-500 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md flex items-center hover:bg-blue-50 transition-colors text-sm"
                      onClick={handleShare}
                    >
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

            {loadingRecentWorks ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-ghibli-dark animate-spin" />
              </div>
            ) : (
              <>
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
                            src={item.original || "/api/placeholder/400/300"}
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
                            src={item.processed || "/api/placeholder/400/300"}
                            alt={`Creation ${item.id}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ))}
                  </motion.div>

                  <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-amber-50/70 to-transparent pointer-events-none" />
                </div>
              </>
            )}

            <div className="text-center mt-4 sm:mt-8">
              <button className="bg-ghibli-dark text-amber-50 px-3 sm:px-5 py-1.5 sm:py-2 rounded-md flex text-sm items-center mx-auto hover:bg-ghibli-dark/90 transition-colors">
                View more creations
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Modals */}
        <LoginModal 
          open={loginOpen} 
          onOpenChange={setLoginOpen} 
          onSwitchToSignup={handleSwitchToSignup} 
        />
        <SignupModal 
          open={signupOpen} 
          onOpenChange={setSignupOpen} 
          onSwitchToLogin={handleSwitchToLogin} 
        />
      </div>
    </main>
  )
}