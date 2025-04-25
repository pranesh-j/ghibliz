"use client"

import { useState, useRef, useEffect, Suspense, memo, useCallback } from "react"
import dynamic from 'next/dynamic'
import { motion } from "framer-motion"
import { Upload, Download, Share2, Loader2, LogIn, UserPlus, ArrowRight, RefreshCw, CreditCard, X, ZoomIn } from "lucide-react" 
import { Button } from "@/components/ui/button"
import { CloudBackground } from "@/components/cloud-background"
import { LoginModal } from "@/components/login-modal"
import { SignupModal } from "@/components/signup-modal"
import { GhibliLogo } from "@/components/ghibli-logo"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import ImageService, { RecentImage } from "@/services/imageService"
import { useRouter } from "next/navigation"
import { Footer } from "@/components/footer"

import { StylePresets } from '@/components/style-presets'

const MemoizedFooter = memo(Footer)
const MemoizedCloudBackground = memo(CloudBackground)

function HomeContent() {
  const { user, isAuthenticated, logout, loading: authLoading, refreshUserProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter();

  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [recentWorks, setRecentWorks] = useState<RecentImage[]>([])
  const [loadingRecentWorks, setLoadingRecentWorks] = useState(false)
  const [imageData, setImageData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPromoPopup, setShowPromoPopup] = useState(false)

  const [selectedStyle, setSelectedStyle] = useState('ghibli')

  const [viewingImage, setViewingImage] = useState<"original" | "processed" | null>(null)
  const [isFullView, setIsFullView] = useState(false)
  
  const [isRedirecting, setIsRedirecting] = useState(false)
  useEffect(() => {
    router.prefetch('/payment');
  }, [router]);

  const handleCloseViewer = () => {
    setViewingImage(null);
    setIsFullView(false);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (viewingImage === "processed" && selectedImage && e.currentTarget) {
      const originalImg = new Image();
      originalImg.onload = () => {
        const aspectRatio = originalImg.width / originalImg.height;
        const newHeight = e.currentTarget.clientHeight || 400;
        const newWidth = newHeight * aspectRatio;
         e.currentTarget.style.width = `${newWidth}px`;
         e.currentTarget.style.height = `${newHeight}px`;
      };
      originalImg.src = selectedImage;
    } else if (e.currentTarget) {
        e.currentTarget.style.width = 'auto';
        e.currentTarget.style.height = 'auto';
    }
  };

  const handleImageError = useCallback(async (index: number, rowType: 'upper' | 'lower') => {
    console.log(`Image at index ${index} in ${rowType} row failed to load, attempting to fetch replacement`);
    
    try {
      const actualIndex = rowType === 'upper' ? index % 6 : (index % 6) + 6;
      
      const updatedWorks = [...recentWorks];
      
      try {
        const newImages = await ImageService.getRecentImages(13);
        
        const existingIds = new Set(recentWorks.map(img => img.id));
        const newImage = newImages.find(img => !existingIds.has(img.id));
        
        if (newImage) {
          console.log(`Found replacement image with id ${newImage.id} for position ${actualIndex}`);
          updatedWorks[actualIndex] = newImage;
          setRecentWorks(updatedWorks);
          return;
        }
      } catch (error) {
        console.error("Failed to fetch replacement image:", error);
      }
      
      updatedWorks[actualIndex] = {
        ...updatedWorks[actualIndex],
        original: "/api/placeholder/400/300",
        processed: "/api/placeholder/400/300"
      };
      
      setRecentWorks(updatedWorks);
    } catch (err) {
      console.error("Error in handleImageError:", err);
    }
  }, [recentWorks]);

  useEffect(() => {
    const fetchRecentWorks = async () => {
      setLoadingRecentWorks(true);
      try {
        const data = await ImageService.getRecentImages(12);
        
        if (data.length > 0) {
          setRecentWorks(data);
        } else {
          setRecentWorks(Array(12).fill(null).map((_, index) => ({ 
            id: index + 1, 
            original: "/api/placeholder/400/300", 
            processed: "/api/placeholder/400/300" 
          })));
        }
      } catch (error) {
        console.error("Failed to fetch recent works:", error);
        toast({
          title: "Couldn't load gallery",
          description: "We couldn't load recent creations. Please try again later.",
          variant: "error"
        });
        setRecentWorks(Array(12).fill(null).map((_, index) => ({ 
          id: index + 1, 
          original: "/api/placeholder/400/300", 
          processed: "/api/placeholder/400/300" 
        })));
      } finally {
        setLoadingRecentWorks(false);
      }
    };
    
    fetchRecentWorks();
    

    const refreshInterval = setInterval(() => {
      console.log("Refreshing gallery images");
      fetchRecentWorks();
    }, 6 * 60 * 60 * 1000); // 6 hours
    
    return () => clearInterval(refreshInterval);
  }, [toast]);

  const handleStyleChange = useCallback((style: string) => {
    setSelectedStyle(style);
  }, [])

  const handleViewImage = useCallback((type: "original" | "processed") => {
    const targetImage = type === "original" ? selectedImage : processedImage;
    if (!targetImage) {
      toast({ title: "Image not available", description: `${type.charAt(0).toUpperCase() + type.slice(1)} image is not loaded.`, variant: "error" });
      return;
    }
    setViewingImage(type);
    setIsFullView(true);
  }, [selectedImage, processedImage, toast])

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!isAuthenticated) {
      setLoginOpen(true)
      toast({ title: "Login required", description: "Please sign in with Google to transform images.", variant: "info" })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    if (user && user.profile.credit_balance <= 0) {
      const region = user.region || 'GLOBAL';
      const isIndia = region === 'IN';
      
      toast({
        title: "No Credits",
        description: isIndia 
          ? "Get started with just ₹30! Pay easily with UPI."
          : "Why pay $20 to ChatGPT when you can do the same for only $1? Check out our pricing!",
        variant: "warning",
        duration: 10000,
        action: (
          <Button variant="secondary" size="sm" onClick={handleBuyCredits}>
            Buy Credits
          </Button>
        ),
      })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    setProcessedImage(null)
    setImageData(null)
    setShowPromoPopup(false)

    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result)
        processImage(file)
      }
    }
    reader.readAsDataURL(file)
  }, [isAuthenticated, user, selectedStyle, toast, refreshUserProfile, fileInputRef])

  const processImage = async (file: File) => {
    setIsProcessing(true)
    try {
      const response = await ImageService.transformImage(file, selectedStyle)
      console.log('Image transformation response:', response)
      const displayUrl = response.preview_url || response.image_url
      console.log('Setting processed image display URL:', displayUrl)

      if (displayUrl) {
        if (displayUrl.startsWith('data:image')) {
          setProcessedImage(displayUrl);
        } else {
          setProcessedImage(displayUrl);
          const img = new Image();
          img.onerror = () => {
            console.warn("Image URL failed to load:", displayUrl);
             toast({ title: "Image display issue", description: "Could not load the processed image preview.", variant: "warning" });
          };
          img.src = displayUrl;
        }
      } else {
        console.error("No valid image URL or data received for display");
         toast({ title: "Processing Error", description: "Could not retrieve the processed image.", variant: "error" });
      }
      setImageData(response)

      await refreshUserProfile();

      const updatedBalance = response.updated_credit_balance;
      console.log("Updated credit balance received from backend:", updatedBalance);

      if (updatedBalance !== undefined && updatedBalance <= 0) {
         setShowPromoPopup(true);
         console.log("Showing promo popup because balance is zero or less.");
      } else {
         console.log("Not showing promo popup. Balance:", updatedBalance);
      }

      toast({ title: "Transformation complete!", description: "Your image has been Transformed.", variant: "success" })

    } catch (error: any) {
      console.error("Image processing error:", error)
      let errorMessage = "Failed to process image. Please try again."
      let errorTitle = "Processing failed"
      if (error.response?.status === 401) {
        errorMessage = "Your session may have expired. Please log in again.";
        setLoginOpen(true);
         await logout();
      } else if (error.response?.status === 402) {
        errorTitle = "Insufficient Credits";
        errorMessage = "Please buy credits to continue transforming images.";
        setShowPromoPopup(true);
      } else if (error.response?.status === 413) {
        errorTitle = "Image Too Large";
        errorMessage = "Image size is too large. Please upload a smaller image.";
      } else if (error.response?.status === 415) {
        errorTitle = "Unsupported Format";
        errorMessage = "Unsupported image format. Please use JPG or PNG.";
      } else if (error.message?.includes('Network Error')) {
         errorMessage = "Network Error. Please check your connection and try again.";
      }
      toast({ title: errorTitle, description: errorMessage, variant: "error" })
      setProcessedImage(null);
      setImageData(null);
    } finally {
      setIsProcessing(false)
       if (fileInputRef.current) {
         fileInputRef.current.value = ""
       }
    }
  }

  const handleDownload = async () => {
    if (!imageData) {
      toast({ title: "No image data", description: "Cannot download.", variant: "error" });
      return;
    }
    if (!isAuthenticated) {
      setLoginOpen(true)
      toast({ title: "Login required", description: "Please sign in to download.", variant: "info" })
      return
    }
    
    try {
      const imageUrl = imageData.image_url || processedImage;
      
      if (!imageUrl) {
        toast({ title: "Download Error", description: "Image URL not found.", variant: "error" });
        return;
      }
      
      console.log("Original image URL:", imageUrl);
      
      
      if (imageUrl.includes('/api/')) {
        console.log("Using existing API URL for download");
        
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Transformed-${imageData.id || Date.now()}.jpg`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        toast({ title: "Download started", description: "Your Artistic image is downloading.", variant: "success" });
        return;
      }
      
      if (imageUrl.includes('supabase.co')) {
        
        const match = imageUrl.match(/\/ghiblits\/(.+)$/);
        if (match && match[1]) {
          const imagePath = match[1];
          console.log("Extracted image path:", imagePath);
          
          const cleanImageUrl = `/api/clean-image/${imagePath}`;
          console.log("Using clean image URL for download:", cleanImageUrl);
          
          const response = await fetch(cleanImageUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
          }
          
          const blob = await response.blob();
          
          // Create a download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Transformed-${imageData.id || Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);
          
          toast({ title: "Download started", description: "Your Artistic image is downloading.", variant: "success" });
          return;
        }
      }
      

      console.log("Using direct URL download as fallback");
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `Transformed-${imageData.id || Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast({ title: "Download started", description: "Your Transformed image is downloading.", variant: "success" });
      
    } catch (error) {
      console.error("Download error:", error);
      toast({ title: "Download failed", description: "Could not download the image. Try again later.", variant: "error" });
      
      if (processedImage && processedImage.startsWith('data:image/')) {
        try {
          console.log("Falling back to data URL download");
          const link = document.createElement('a');
          link.href = processedImage;
          link.download = `Art-preview-${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast({ title: "Using preview image", description: "Downloading preview as fallback.", variant: "warning" });
        } catch (e) {
          console.error("Fallback download also failed:", e);
        }
      }
    }
  }

  const handleShare = async () => {
    if (!imageData || !imageData.id) {
      toast({ title: "Cannot Share", description: "Image data is missing.", variant: "error" });
      return;
    }
     if (!isAuthenticated) {
      setLoginOpen(true);
      toast({ title: "Login required", description: "Please sign in to share.", variant: "info" });
      return;
    }
    const shareUrl = imageData.preview_url || window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Image Art!', text: 'Check out this image I transformed using Ghiblit.art!', url: shareUrl });
        toast({ title: "Shared!", description: "Image shared successfully.", variant: "success" });
      } else {
        navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link Copied!", description: "Image link copied to clipboard.", variant: "success" });
      }
    } catch (error) {
      console.error("Share error:", error);
      navigator.clipboard.writeText(shareUrl);
      toast({ title: "Share Failed", description: "Link copied to clipboard instead.", variant: "warning" });
    }
  }


  const handleReset = () => {
    setSelectedImage(null)
    setProcessedImage(null)
    setImageData(null)
    setViewingImage(null)
    setIsFullView(false)
    setShowPromoPopup(false);
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
    setIsRedirecting(true);
    router.push('/payment');
    setShowPromoPopup(false);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <MemoizedCloudBackground />
      <div className="relative z-10 min-h-screen">
        <header className="pt-3 sm:pt-4 px-3 md:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <GhibliLogo />
            <div className="flex gap-2 sm:gap-3">
            {authLoading ? (
                <div className="flex items-center gap-2">
                   <Loader2 className="h-5 w-5 animate-spin text-ghibli-dark/50" />
                   <span className="text-sm text-ghibli-dark/70">Loading...</span>
                </div>
             ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center text-sm text-ghibli-dark mr-2">
                  <span className="font-medium">
                    {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email || user.username}
                  </span>
                  {user.profile && (
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                        {user.profile.credit_balance} credit{user.profile.credit_balance !== 1 ? 's' : ''}
                      </span>
                      <Button
                        className="ml-1 text-xs px-2 py-0.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-full text-center transition-colors relative overflow-hidden"
                        onClick={handleBuyCredits}
                        disabled={isRedirecting}
                        aria-label="Buy Credits"
                      >
                        {isRedirecting ? (
                          <>
                            <span className="inline-block h-3 w-3 mr-1 animate-spin rounded-full border border-white border-t-transparent" />
                            <span>Loading</span>
                          </>
                        ) : (
                          "Buy Credits"
                        )}
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

        <section className="pt-2 sm:pt-6 pb-6 sm:pb-12 px-3 sm:px-8">
          <div className="max-w-4xl mx-auto text-center">
            {!isFullView && (
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-playfair text-ghibli-dark mb-1 sm:mb-2 leading-tight">
                Turn photos into Art
              </h1>
            )}

            {!selectedImage ? (
              <>
                <div className="p-5 sm:p-6 md:p-10 bg-white/90 backdrop-blur-sm rounded-3xl border border-amber-100 shadow-xl max-w-3xl mx-auto mt-3 sm:mt-6 mb-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={isProcessing || authLoading}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer block border-2 border-dashed rounded-2xl p-5 sm:p-8 text-center transition-colors ${isProcessing || authLoading ? 'border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed' : 'border-amber-200 hover:border-amber-300'}`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-50 flex items-center justify-center mb-3 sm:mb-4">
                        <Upload className="w-7 h-7 sm:w-8 sm:h-8 text-amber-600" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-playfair text-ghibli-dark mb-1 sm:mb-2">Begin your artistic journey</h3>
                      <p className="text-sm text-ghibli-dark/70">Upload JPG or PNG images</p>
                    </div>
                  </label>
                </div>

                <StylePresets onSelectStyle={handleStyleChange} />
              </>
            ) : (

              <div className={`p-4 sm:p-6 bg-white/90 backdrop-blur-sm rounded-3xl border border-amber-100 shadow-xl max-w-3xl mx-auto mt-4 sm:mt-8 ${isFullView ? 'pt-2 pb-2' : ''}`}>
                {viewingImage ? (

                  <div className="py-2 sm:py-4">
                    <div className="relative w-full flex justify-center">
                      <button
                        onClick={handleCloseViewer}
                        className="absolute -top-2 right-2 z-30 bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white"
                        aria-label="Close viewer"
                      >
                        <X className="h-5 w-5 text-ghibli-dark" />
                      </button>
                      <img
                        key={viewingImage === "original" ? selectedImage : processedImage}
                        src={viewingImage === "original" ? selectedImage : processedImage || ""}
                        alt={viewingImage === "original" ? "Original Upload" : "Transformed Result"}
                        className="w-auto max-h-[70vh] object-contain" 
                        onLoad={handleImageLoad}
                        onError={(e) => { e.currentTarget.alt = "Image failed to load"; }}
                      />
                    </div>
                    <div className="flex justify-center gap-3 sm:gap-5 mt-4">
                      <button
                        className="bg-amber-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-amber-600 transition-colors text-sm font-medium min-w-[110px]"
                        onClick={handleDownload} disabled={!processedImage}>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </button>
                      <button
                        className="bg-amber-50 text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-amber-100 transition-colors text-sm font-medium min-w-[110px] border border-amber-200"
                        onClick={handleShare} disabled={!processedImage}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                      </button>
                      <button
                        className="bg-white text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors text-sm font-medium min-w-[110px] border border-gray-200"
                        onClick={handleReset}>
                        <RefreshCw className="mr-2 h-4 w-4" /> New image
                      </button>
                    </div>
                  </div>
                ) : (

                  <div>
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-6">

                      <div>
                        <p className="text-xs sm:text-sm font-medium text-ghibli-dark mb-1 sm:mb-2 text-center">Original</p>
                        <div
                          className="rounded-lg overflow-hidden bg-gray-100 aspect-[4/3] border-2 border-amber-100 hover:border-amber-200 transition-all cursor-pointer group relative"
                          onClick={() => handleViewImage("original")}
                        >
                          <img src={selectedImage || ""} alt="Original Upload" className="w-full h-full object-cover" />
                        </div>
                      </div>

                      <div>
                        <p className="text-xs sm:text-sm font-medium text-ghibli-dark mb-1 sm:mb-2 text-center">Transformed</p>
                        <div
                          className={`rounded-lg overflow-hidden bg-gray-100 aspect-[4/3] border-2 border-amber-100 ${processedImage ? 'hover:border-amber-200 cursor-pointer group relative' : ''}`}
                          onClick={() => processedImage && handleViewImage("processed")}
                        >
                          {isProcessing ? (
                            <div className="w-full h-full flex items-center justify-center bg-amber-50/50">
                              <div className="text-center">
                                <Loader2 className="w-8 h-8 text-ghibli-dark animate-spin mx-auto mb-2 sm:mb-3" />
                                <p className="text-xs text-ghibli-dark/70">Creating magic...</p>
                              </div>
                            </div>
                          ) : processedImage ? (
                            <img src={processedImage} alt="Transformed Result" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.alt = "Preview failed to load"; }}/>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <p className="text-xs text-center text-gray-500 px-2">Upload an image to see the result</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {processedImage && !isProcessing && (
                      <div className="flex justify-center gap-3 sm:gap-5 mt-4 sm:mt-6">
                        <button
                          className="bg-amber-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-amber-600 transition-colors text-sm font-medium min-w-[110px]"
                          onClick={handleDownload}>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </button>
                        <button
                          className="bg-amber-50 text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-amber-100 transition-colors text-sm font-medium min-w-[110px] border border-amber-200"
                          onClick={handleShare}>
                          <Share2 className="mr-2 h-4 w-4" /> Share
                        </button>
                        <button
                          className="bg-white text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors text-sm font-medium min-w-[110px] border border-gray-200"
                          onClick={handleReset}>
                          <RefreshCw className="mr-2 h-4 w-4" /> New image
                        </button>
                      </div>
                    )}
                    {!processedImage && !isProcessing && selectedImage && (
                      <div className="flex justify-center mt-4 sm:mt-6">
                        <button
                          className="bg-white text-ghibli-dark px-5 sm:px-6 py-2 sm:py-2.5 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors text-sm font-medium min-w-[110px] border border-gray-200"
                          onClick={handleReset}>
                          <RefreshCw className="mr-2 h-4 w-4" /> Start Over
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="py-4 sm:py-6 px-3 sm:px-8 bg-amber-50/70">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-playfair text-ghibli-dark text-center mb-3 sm:mb-5">Recent Creations</h2>
            
            {loadingRecentWorks ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-ghibli-dark animate-spin" />
              </div>
            ) : (
              <>

                <div className="relative w-full overflow-hidden mb-3 sm:mb-4">
                  <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-r from-amber-50/70 to-transparent pointer-events-none" />
                  <motion.div 
                    className="flex gap-3 sm:gap-4"
                    initial={{ x: 0 }}
                    animate={{ x: "-50%" }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear", repeatType: "loop" }}
                    style={{ 
                      width: "200%", 
                      willChange: "transform",
                      backfaceVisibility: "hidden",
                      transform: "translateZ(0)"
                    }}
                  >

                    {[...recentWorks.slice(0, 6), ...recentWorks.slice(0, 6)].map((item, index) => (
                      <div 
                        key={`top-${item.id}-${index}`} 
                        className="shrink-0 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all w-40 sm:w-60 border-2 border-transparent hover:border-ghibli-cream hover:scale-105 hover:z-10"
                        style={{ transition: "transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease" }}
                      >
                        <div className="aspect-[4/3] relative">
                          <img 
                            src={item.original || "/api/placeholder/400/300"} 
                            alt={`Original ${item.id}`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {

                              e.currentTarget.src = "/api/placeholder/400/300";

                              handleImageError(index, 'upper');
                            }}
                            loading="lazy"
                          />
                        </div>
                      </div>
                    ))}
                  </motion.div>
                  <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-amber-50/70 to-transparent pointer-events-none" />
                </div>
                
                {/* Second Row - Processed Images */}
                <div className="relative w-full overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-r from-amber-50/70 to-transparent pointer-events-none" />
                  <motion.div 
                    className="flex gap-3 sm:gap-4"
                    initial={{ x: "-50%" }}
                    animate={{ x: "0%" }}
                    transition={{ duration: 45, repeat: Infinity, ease: "linear", repeatType: "loop" }}
                    style={{ 
                      width: "200%", 
                      willChange: "transform",
                      backfaceVisibility: "hidden",
                      transform: "translateZ(0)"
                    }}
                  >
                    {/* Last 6 images + duplicates for continuous scrolling */}
                    {[...recentWorks.slice(6, 12), ...recentWorks.slice(6, 12)].map((item, index) => (
                      <div 
                        key={`bottom-${item.id}-${index}`} 
                        className="shrink-0 bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all w-40 sm:w-60 border-2 border-transparent hover:border-ghibli-cream hover:scale-105 hover:z-10"
                        style={{ transition: "transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease" }}
                      >
                        <div className="aspect-[4/3] relative">
                          <img 
                            src={item.processed || "/api/placeholder/400/300"} 
                            alt={`Processed ${item.id}`} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Set placeholder immediately
                              e.currentTarget.src = "/api/placeholder/400/300";
                              // Try to fetch a replacement
                              handleImageError(index, 'lower');
                            }}
                            loading="lazy"
                          />
                        </div>
                      </div>
                    ))}
                  </motion.div>
                  <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 z-10 bg-gradient-to-l from-amber-50/70 to-transparent pointer-events-none" />
                </div>
              </>
            )}
          </div>
        </section>

        {showPromoPopup && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-4 max-w-xs z-50 border border-amber-200"
          >
            <button onClick={() => setShowPromoPopup(false)} className="absolute top-1 right-1 text-gray-400 hover:text-gray-700 p-1 rounded-full" aria-label="Close promotion"> <X size={16} /> </button>

            {user?.region === 'IN' ? (
              <>
                <p className="text-sm font-medium text-ghibli-dark mb-2">Transform More Images!</p>
                <p className="text-xs text-ghibli-dark/70 mb-2">Starting at just ₹30 with UPI payment option.</p>
                <div className="mb-3 flex items-center bg-blue-50 rounded p-1.5 text-xs">
                  <span className="bg-blue-100 text-blue-700 font-medium px-1.5 py-0.5 rounded mr-1.5">UPI</span>
                  <span className="text-blue-600">Quick and secure payments</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-ghibli-dark mb-2">Why pay ChatGPT $20?</p>
                <p className="text-xs text-ghibli-dark/70 mb-3">Get 10 image transformations for just $1!</p>
              </>
            )}

            <button
              onClick={handleBuyCredits}
              disabled={isRedirecting}
              className="w-full bg-amber-500 text-white py-2 rounded text-sm hover:bg-amber-600 transition-colors"
            >
              {isRedirecting ? (
                <>
                  <span className="inline-block h-3 w-3 mr-1 animate-spin rounded-full border border-white border-t-transparent" />
                  <span>Loading...</span>
                </>
              ) : (
                user?.region === 'IN' ? "Get Credits with UPI" : "Buy Credits"
              )}
            </button>
          </motion.div>
        )}


        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} onSwitchToSignup={handleSwitchToSignup} />
        <SignupModal open={signupOpen} onOpenChange={setSignupOpen} onSwitchToLogin={handleSwitchToLogin} />
        

        <MemoizedFooter />
      </div>
    </main>
  )
}

export default memo(function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
})