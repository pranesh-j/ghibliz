"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Upload, Download, Share2, Loader2, LogIn, UserPlus, ArrowRight, RefreshCw, CreditCard, X } from "lucide-react"
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
  const [hasUsedFreeImage, setHasUsedFreeImage] = useState(false)
  const [showPromoPopup, setShowPromoPopup] = useState(false)
  
  // Image viewing state
  const [viewingImage, setViewingImage] = useState<"original" | "processed" | null>(null)
  const [isFullView, setIsFullView] = useState(false)

  // Used for managing sizing of the generated image
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (viewingImage === "processed" && selectedImage && e.currentTarget) {
      const originalImg = new Image();
      originalImg.onload = () => {
        // Match dimensions of original image
        const aspectRatio = originalImg.width / originalImg.height;
        const newHeight = e.currentTarget.clientHeight || 400;
        const newWidth = newHeight * aspectRatio;
        e.currentTarget.style.width = `${newWidth}px`;
      };
      originalImg.src = selectedImage;
    }
  };

  // Fetch recent works on component mount
  useEffect(() => {
    const fetchRecentWorks = async () => {
      setLoadingRecentWorks(true)
      try {
        const data = await ImageService.getRecentImages(6)
        // Filter out items with invalid URLs if possible
        const validData = data.filter(item => 
          (item.original && !item.original.includes('undefined')) || 
          (item.processed && !item.processed.includes('undefined'))
        )
        setRecentWorks(validData.length > 0 ? validData : data)
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

  // Check if user has already used their free image
  useEffect(() => {
    // Check localStorage for free image usage
    const freeImageUsed = localStorage.getItem('freeImageUsed') === 'true'
    setHasUsedFreeImage(freeImageUsed)
  }, [])
  
  const handleViewImage = (type: "original" | "processed") => {
    // Check if image is available before opening viewer
    if (type === "processed" && !processedImage) {
      toast({
        title: "Image not available",
        description: "Processed image is not yet available or failed to load",
        variant: "error"
      });
      return;
    }
    
    console.log(`Viewing ${type} image:`, type === "original" ? selectedImage : processedImage);
    setViewingImage(type);
    setIsFullView(true);
  }
  
  const handleCloseViewer = () => {
    setViewingImage(null);
    setIsFullView(false);
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Only show restrictions for non-Google authenticated users
    if (!isAuthenticated && hasUsedFreeImage) {
      setLoginOpen(true)
      toast({
        title: "Login required",
        description: "Please sign in with Google to continue using Ghibliz",
        variant: "info"
      })
      
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }

    // Reset states
    setProcessedImage(null)
    setImageData(null)
    setShowPromoPopup(false) // Hide any existing popup
    
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
      // Call the API to transform the image
      const response = await ImageService.transformImage(file)
      
      // Log response for debugging
      console.log('Image transformation response:', response)
      
      // Set the processed image URL and data
      const imageUrl = response.preview_url || response.image_url
      console.log('Setting processed image URL:', imageUrl)
      
      // Handle case where we got base64 image data directly
      if (imageUrl && imageUrl.startsWith('data:image')) {
        setProcessedImage(imageUrl)
      } 
      // Handle case where we got a URL but need to check if it's valid
      else if (imageUrl) {
        // For URLs, we'll still set it but also add a fallback
        setProcessedImage(imageUrl)
        // Create a backup image in case of 404
        const img = new Image()
        img.onerror = () => {
          console.warn("Image URL failed to load, checking for image_data fallback")
          // If there's fallback base64 data in the response, use that instead
          if (response.image_data) {
            console.log("Using image_data fallback")
            setProcessedImage(response.image_data)
          }
        }
        img.src = imageUrl
      } else {
        console.error("No valid image URL or data received")
      }
      
      setImageData(response)
      
      // Mark that user has used their free image if not authenticated
      if (!isAuthenticated && !hasUsedFreeImage) {
        setHasUsedFreeImage(true)
        localStorage.setItem('freeImageUsed', 'true')
      }
      
      // Show the promotion popup AFTER successful image creation
      // Show popup for both authenticated and non-authenticated users
      setShowPromoPopup(true)
      
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
        errorMessage = "Please sign in with Google for unlimited transformations."
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
    
    // Require login to download
    if (!isAuthenticated) {
      setLoginOpen(true)
      toast({
        title: "Login required",
        description: "Please sign in with Google to download your image",
        variant: "info"
      })
      return
    }
    
    try {
      // If paid image, download the full version, otherwise use preview
      if (imageData.is_paid && imageData.id && imageData.download_token) {
        try {
          await ImageService.downloadAndSaveImage(imageData.id, imageData.download_token)
        } catch (err) {
          console.error("Error downloading via API:", err)
          // Fallback to direct base64 download if available
          if (processedImage && processedImage.startsWith('data:image')) {
            const link = document.createElement('a')
            link.href = processedImage
            link.download = `ghiblified-preview-${imageData.id || 'image'}.jpg`
            document.body.appendChild(link)
            link.click()
            link.remove()
          } else {
            throw err
          }
        }
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
    setViewingImage(null)
    setIsFullView(false)
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
    // Close the promo popup to avoid having both messages visible
    setShowPromoPopup(false)
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
                  <span className="font-medium">
                    {/* Try different user properties in this order */}
                    {user?.first_name 
                      ? `${user.first_name} ${user.last_name || ''}` 
                      : user?.email || user?.username}
                  </span>
                  {user?.profile && (
                    <div className="flex items-center gap-1">
                      <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                        {user.profile.credit_balance} credits
                      </span>
                      <Button
                        className="p-1 h-auto bg-transparent hover:bg-transparent text-amber-600"
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
            {!isFullView && (
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-playfair text-ghibli-dark mb-1 sm:mb-3 leading-tight">
                Turn photos into Ghibli art
              </h1>
            )}

            {/* Upload/Processing Area - More compact */}
            {!selectedImage ? (
              <div className="p-6 sm:p-8 md:p-14 bg-white/90 backdrop-blur-sm rounded-3xl border border-amber-100 shadow-xl max-w-3xl mx-auto mt-4 sm:mt-8 mb-8 sm:mb-12">
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
                  className="cursor-pointer block border-2 border-dashed border-amber-200 rounded-2xl p-6 sm:p-10 text-center hover:border-amber-300 transition-colors"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-50 flex items-center justify-center mb-4 sm:mb-6">
                      <Upload className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
                    </div>
                    <h3 className="text-xl sm:text-2xl font-playfair text-ghibli-dark mb-2 sm:mb-3">Begin your artistic journey</h3>
                    <p className="text-sm sm:text-base text-ghibli-dark/70">Upload JPG or PNG images</p>
                  </div>
                </label>
              </div>
            ) : (
              <div className={`p-4 sm:p-6 bg-white/90 backdrop-blur-sm rounded-3xl border border-amber-100 shadow-xl max-w-3xl mx-auto ${isFullView ? 'pt-2 pb-2' : ''}`}>
                {viewingImage ? (
                  // Full image viewer without any extras
                  <div className="py-2 -mt-10 sm:-mt-12">
                    <div className="relative w-full flex justify-center">
                      {/* Close button - Moved to outer div for better positioning */}
                      <button 
                        onClick={handleCloseViewer}
                        className="absolute -top-2 right-2 z-30 bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white"
                        aria-label="Close viewer"
                      >
                        <X className="h-5 w-5 text-ghibli-dark" />
                      </button>
                      
                      <img
                        src={viewingImage === "original" ? selectedImage : processedImage || ""}
                        alt={viewingImage === "original" ? "Original" : "Ghiblified"}
                        className="w-auto max-h-[70vh] object-contain"
                        style={{
                          background: 'white',
                          borderRadius: '8px'
                        }}
                        onLoad={handleImageLoad}
                      />
                    </div>
                    
                    <div className="flex justify-center gap-3 sm:gap-5 mt-4">
                      <button 
                        className="bg-amber-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-amber-600 transition-colors text-sm font-medium min-w-[110px]"
                        onClick={handleDownload}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </button>
                      <button 
                        className="bg-amber-50 text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-amber-100 transition-colors text-sm font-medium min-w-[110px] border border-amber-200"
                        onClick={handleShare}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </button>
                      <button 
                        className="bg-white text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors text-sm font-medium min-w-[110px] border border-gray-200"
                        onClick={handleReset}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        New image
                      </button>
                    </div>
                  </div>
                ) : (
                <div>
                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Original Image */}
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-ghibli-dark mb-1 sm:mb-2 text-center">Original</p>
                      <div 
                        className="rounded-lg overflow-hidden bg-white aspect-[4/3] border-2 border-amber-100 hover:border-amber-200 transition-all cursor-pointer"
                        onClick={() => handleViewImage("original")}
                      >
                        <img
                          src={selectedImage}
                          alt="Original"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Processed Image */}
                    <div>
                      <p className="text-xs sm:text-sm font-medium text-ghibli-dark mb-1 sm:mb-2 text-center">Ghiblified</p>
                      <div className="rounded-lg overflow-hidden bg-white aspect-[4/3] border-2 border-amber-100">
                        {isProcessing ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 text-amber-500 animate-spin mx-auto mb-2 sm:mb-3" />
                              <p className="text-xs sm:text-sm text-ghibli-dark/70">Creating magic...</p>
                            </div>
                          </div>
                        ) : (
                          processedImage && (
                            <div 
                              className="w-full h-full relative group cursor-pointer"
                              onClick={() => handleViewImage("processed")}
                            >
                              <img
                                src={processedImage}
                                alt="Processed"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error("Failed to load processed image:", processedImage);
                                  
                                  // Try to display a fallback message in the image container
                                  const container = e.currentTarget.parentElement;
                                  if (container) {
                                    e.currentTarget.style.display = 'none';
                                    const fallbackEl = document.createElement('div');
                                    fallbackEl.className = 'w-full h-full flex items-center justify-center bg-amber-50';
                                    fallbackEl.innerHTML = '<p class="text-sm text-center px-4">Image processed but temporarily unavailable.<br>Try downloading instead.</p>';
                                    container.appendChild(fallbackEl);
                                  }
                                  
                                  toast({
                                    title: "Image display issue",
                                    description: "The image was processed but can't be displayed. Try the download button.",
                                    variant: "warning"
                                  });
                                }}
                              />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {processedImage && !isProcessing && (
                    <div className="flex justify-center gap-3 sm:gap-5 mt-4 sm:mt-6">
                      <button 
                        className="bg-amber-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-amber-600 transition-colors text-sm font-medium min-w-[110px]"
                        onClick={handleDownload}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </button>
                      <button 
                        className="bg-amber-50 text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-amber-100 transition-colors text-sm font-medium min-w-[110px] border border-amber-200"
                        onClick={handleShare}
                      >
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </button>
                      <button 
                        className="bg-white text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors text-sm font-medium min-w-[110px] border border-gray-200"
                        onClick={handleReset}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        New image
                      </button>
                    </div>
                  )}
                </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Recent Creations Section - with scrolling gallery */}
        <section className="py-4 sm:py-6 px-3 sm:px-8 bg-amber-50/70">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-playfair text-ghibli-dark text-center mb-3 sm:mb-5">Recent Creations</h2>

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
                            onError={(e) => {
                              // Replace with placeholder on error
                              e.currentTarget.src = "/api/placeholder/400/300";
                              if (e.currentTarget.src.includes("placeholder")) {
                                e.currentTarget.onerror = null; // Prevent infinite loop
                              }
                            }}
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
                            onError={(e) => {
                              // Replace with placeholder on error
                              e.currentTarget.src = "/api/placeholder/400/300";
                              if (e.currentTarget.src.includes("placeholder")) {
                                e.currentTarget.onerror = null; // Prevent infinite loop
                              }
                            }}
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

        {/* Promotion Popup */}
        {showPromoPopup && (
          <div className="fixed bottom-4 right-4 bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-4 max-w-xs animate-fade-in-up z-50 border border-amber-200">
            <button 
              onClick={() => setShowPromoPopup(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
            <p className="text-sm font-medium text-ghibli-dark mb-2">Why pay ChatGPT 20$ when you can do it for 1$?</p>
            <p className="text-xs text-ghibli-dark/70 mb-3">Get 10 transforms for just $1!</p>
            <button 
              onClick={handleBuyCredits}
              className="w-full bg-amber-500 text-white py-2 rounded text-sm hover:bg-amber-600 transition-colors"
            >
              Buy Credits
            </button>
          </div>
        )}

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