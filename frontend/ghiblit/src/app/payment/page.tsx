"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, QrCode, Smartphone, Upload, X, Info, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CloudBackground } from "@/components/cloud-background"
import { GhibliLogo } from "@/components/ghibli-logo"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import api from "@/services/api"


// Payment Timer Component
const PaymentTimer = ({ expiresAt, onExpire }) => {
  const [countdown, setCountdown] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (!expiresAt) return;
    
    const calculateTimeLeft = () => {
      const expiryTime = new Date(expiresAt).getTime();
      const now = new Date().getTime();
      return Math.max(0, Math.floor((expiryTime - now) / 1000));
    };
    
    // Set initial countdown
    setCountdown(calculateTimeLeft());
    
    // Update countdown every second
    const timer = setInterval(() => {
      const timeLeft = calculateTimeLeft();
      setCountdown(timeLeft);
      
      if (timeLeft <= 0) {
        clearInterval(timer);
        
        // Handle expiration
        if (onExpire && typeof onExpire === 'function') {
          onExpire();
        } else {
          // If no callback provided, reload the page
          router.refresh();
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresAt, onExpire, router]);
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  return (
    <div className="p-3 bg-blue-50 border border-blue-100 rounded-md mb-4">
      <div className="flex items-start">
        <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-blue-700">
            <span className="font-medium">
              Time remaining to complete payment: {formatTime(countdown)}
            </span>
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Please make payment and upload screenshot before time expires
          </p>
        </div>
      </div>
    </div>
  );
};

// Reference Code Highlighter Component
const ReferenceCodeHighlighter = ({ referenceCode }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = () => {
    navigator.clipboard.writeText(referenceCode);
    setCopied(true);
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  return (
    <div className="mt-4 mb-4">
      <p className="text-sm font-medium text-gray-700 mb-1">
        Payment Reference Code (add to payment note):
      </p>
      <div className="flex items-center">
        <div className="bg-amber-50 py-2 px-3 rounded-l border-l border-t border-b border-amber-200 flex-grow">
          <code className="font-mono text-lg font-semibold tracking-wider">{referenceCode}</code>
        </div>
        <button
          onClick={handleCopy}
          className="bg-amber-100 hover:bg-amber-200 py-2 px-3 rounded-r border-r border-t border-b border-amber-200"
          aria-label="Copy reference code"
        >
          {copied ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <Copy className="h-5 w-5 text-amber-700" />
          )}
        </button>
      </div>
      <p className="text-xs text-red-600 mt-2 font-medium">
        Important: This exact code must be included in your payment note/reference field
      </p>
    </div>
  );
};

// Updated interfaces
interface PricingPlan {
  id: number;
  name: string;
  credits: number;
  price_inr: number;
  is_active: boolean;
}

interface PaymentSession {
  session_id: number;
  amount: number;
  plan_name: string;
  expires_at: string;
  upi_link: string;              // Direct UPI link from backend
  qr_code_data: string;          // Base64 encoded QR code image
  reference_code?: string;       // Reference code (may be included from backend)
}

export default function PaymentPage() {
  const { user, isAuthenticated, refreshUserProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const pricingPlans: PricingPlan[] = [
    {
      id: 1,
      name: "Basic",
      credits: 3,
      price_inr: 49,
      is_active: true
    },
    {
      id: 2,
      name: "Standard",
      credits: 10,
      price_inr: 99,
      is_active: true
    }
  ];
  
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan>(pricingPlans[0])
  const [loading, setLoading] = useState(false)
  const [creatingPayment, setCreatingPayment] = useState(false)
  
  // Payment state
  const [currentSession, setCurrentSession] = useState<PaymentSession | null>(null)
  const [paymentMode, setPaymentMode] = useState<'link' | 'qr'>('link')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)
  
  // Handle session expiration
  const handleSessionExpired = () => {
    toast({
      title: "Session expired",
      description: "Payment session has expired. Please create a new session.",
      variant: "error"
    });
    
    // Reset the payment state
    setCurrentSession(null);
    setVerificationComplete(false);
    setScreenshot(null);
    setPreviewUrl(null);
  };
  
  // Create payment session
  const handleCreatePayment = async () => {
    if (!selectedPlan) return
    
    setCreatingPayment(true)
    try {
      // Real API call to create payment session
      const response = await api.post('/payments/sessions/create/', {
        plan_id: selectedPlan.id
      });
      
      setCurrentSession(response.data);
      
      toast({
        title: "Payment initialized",
        description: "Complete the payment using UPI",
        variant: "success"
      });
    } catch (error) {
      console.error("Failed to create payment session:", error)
      toast({
        title: "Payment initialization failed",
        description: "Please try again",
        variant: "error"
      })
    } finally {
      setCreatingPayment(false)
    }
  }
  
  // Handle screenshot upload
  const handleScreenshotChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    // Check file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "error"
      })
      return
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Screenshot must be less than 5MB",
        variant: "error"
      })
      return
    }
    
    setScreenshot(file)
    
    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }


  const handleVerifyPayment = async () => {
    if (!currentSession || !screenshot) return
    
    setSubmittingVerification(true)
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('screenshot', screenshot);
      
      // Send to backend for verification
      const response = await api.post(`/payments/sessions/${currentSession.session_id}/verify/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setVerificationComplete(true)
      
      // Add this line to refresh the user profile after verification
      await refreshUserProfile();
      
      toast({
        title: "Verification successful",
        description: response.data.message || "Credits have been added to your account",
        variant: "success"
      })
    } catch (error: any) {
      // Improved error handling with toast notifications
      console.error("Verification error:", error);
      
      let errorMessage = "Verification failed. Please try again.";
      let errorTitle = "Verification Failed";
      
      // Extract detailed error message if available
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show toast with error details
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "error"
      });
      
      // Reset screenshot if needed on verification failure
      // Uncomment if you want to clear the screenshot on failure
      // setScreenshot(null);
      // setPreviewUrl(null);
    } finally {
      setSubmittingVerification(false)
    }
  }

  // Reset the payment process
  const handleReset = () => {
    setCurrentSession(null)
    setVerificationComplete(false)
    setScreenshot(null)
    setPreviewUrl(null)
  }
  
  // Go back to home page
  const handleGoHome = () => {
    router.push('/')
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/')
      toast({
        title: "Login required",
        description: "Please sign in to continue",
        variant: "error"
      })
    }
  }, [isAuthenticated, router, toast])

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

            {isAuthenticated && user && (
              <div className="text-sm text-ghibli-dark">
                <span className="font-medium">
                  {user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.email}
                </span>
                {user.profile && (
                  <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">
                    {user.profile.credit_balance} credits
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={handleGoHome}
            className="flex items-center text-sm text-ghibli-dark mb-6 hover:text-ghibli-dark/80 transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </button>

          {/* Page Title */}
          <h1 className="text-3xl md:text-4xl font-playfair text-ghibli-dark mb-6 text-center">
            Buy Credits
          </h1>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-ghibli-dark animate-spin" />
            </div>
          ) : (
            <>
              {/* Payment Flow Container */}
              <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8">
                {!currentSession ? (
                  /* Step 1: Plan Selection */
                  <div>
                    <h2 className="text-xl font-playfair text-ghibli-dark mb-4">
                      Choose a Package
                    </h2>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                      {pricingPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedPlan?.id === plan.id
                              ? "border-amber-500 bg-amber-50"
                              : "border-gray-200 hover:border-amber-300"
                          }`}
                          onClick={() => setSelectedPlan(plan)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-medium text-ghibli-dark">
                              {plan.name} Package
                            </h3>
                            {selectedPlan?.id === plan.id && (
                              <CheckCircle2 className="h-5 w-5 text-amber-500" />
                            )}
                          </div>
                          <p className="text-3xl font-bold text-ghibli-dark mb-2">
                            ₹{plan.price_inr}
                          </p>
                          <p className="text-sm text-ghibli-dark/80">
                            {plan.credits} image transformations
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg font-medium"
                      onClick={handleCreatePayment}
                      disabled={!selectedPlan || creatingPayment}
                    >
                      {creatingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Proceed to Payment
                        </>
                      )}
                    </Button>
                  </div>
                ) : !verificationComplete ? (
                  /* Step 2: Payment and Verification */
                  <div>
                    <h2 className="text-xl font-playfair text-ghibli-dark mb-4">
                      Complete Your Payment
                    </h2>
                    
                    {/* Payment Details Summary */}
                    <div className="bg-amber-50 p-4 rounded-lg mb-6">
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-ghibli-dark/80">Package:</span>
                        <span className="text-sm font-medium text-ghibli-dark">
                          {currentSession?.plan_name} ({selectedPlan?.credits} credits)
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-ghibli-dark/80">Amount:</span>
                        <span className="text-sm font-medium text-ghibli-dark">
                          ₹{currentSession.amount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-ghibli-dark/80">Order ID:</span>
                        <span className="text-sm font-medium text-ghibli-dark">
                          #{currentSession.session_id}
                        </span>
                      </div>
                    </div>
                    
                    {/* Payment Timer - UPDATED */}
                    {currentSession && (
                      <PaymentTimer 
                        expiresAt={currentSession.expires_at}
                        onExpire={handleSessionExpired}
                      />
                    )}
                    
                    {/* Reference Code Highlighter - NEW */}
                    {currentSession && currentSession.reference_code && (
                      <ReferenceCodeHighlighter referenceCode={currentSession.reference_code} />
                    )}
                    
                    {/* Payment Method Toggle */}
                    <div className="flex border rounded-lg overflow-hidden mb-6">
                      <button
                        className={`flex-1 py-2 flex justify-center items-center ${
                          paymentMode === 'link'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        } transition-colors`}
                        onClick={() => setPaymentMode('link')}
                      >
                        <Smartphone className="mr-2 h-4 w-4" />
                        UPI Link
                      </button>
                      <button
                        className={`flex-1 py-2 flex justify-center items-center ${
                          paymentMode === 'qr'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                        } transition-colors`}
                        onClick={() => setPaymentMode('qr')}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        QR Code
                      </button>
                    </div>
                    
                    {/* UPI Link */}
                    {paymentMode === 'link' && (
                      <div className="mb-6">
                        <p className="text-sm text-center text-ghibli-dark mb-4">
                          Click the button below to open your UPI app
                        </p>
                        
                        <div className="flex justify-center mb-4">
                          <a
                            href={currentSession.upi_link}
                            className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-lg font-medium text-base flex items-center"
                          >
                            <Smartphone className="mr-2 h-5 w-5" />
                            Proceed to UPI
                          </a>
                        </div>
                        
                        <div className="flex justify-center gap-6 items-center">
                          <a 
                            href={currentSession.upi_link}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/gpay.svg"
                              alt="Google Pay"
                              width={180}
                              height={180}
                              className="h-16 w-auto object-contain"
                            />
                          </a>
                          <a 
                            href={currentSession.upi_link}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/phonepe.svg"
                              alt="PhonePe"
                              width={180}
                              height={180}
                              className="h-16 w-auto object-contain"
                            />
                          </a>
                          <a 
                            href={currentSession.upi_link}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/cred.svg"
                              alt="cred"
                              width={100}
                              height={100}
                              className="h-12 w-auto object-contain"
                            />
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* QR Code */}
                    {paymentMode === 'qr' && (
                      <div className="mb-6">
                        <div className="flex justify-center mb-4">
                          <div className="bg-white p-3 rounded-lg border">
                            {/* Use the base64 QR code image directly */}
                            <img
                              src={currentSession.qr_code_data}
                              alt="UPI QR Code"
                              width={200}
                              height={200}
                              className="rounded"
                            />
                          </div>
                        </div>
                        <p className="text-sm text-center text-ghibli-dark mb-2">
                          Scan with any UPI app to pay
                        </p>
                        <div className="flex justify-center gap-6 mb-1 items-center">
                          <div className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <img
                              src="/gpay.svg"
                              alt="Google Pay"
                              width={180}
                              height={180}
                              className="h-16 w-auto object-contain"
                            />
                          </div>
                          <div className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <img
                              src="/phonepe.svg"
                              alt="PhonePe"
                              width={180}
                              height={180}
                              className="h-16 w-auto object-contain"
                            />
                          </div>
                          <div className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <img
                              src="/cred.svg"
                              alt="cred"
                              width={100}
                              height={100}
                              className="h-12 w-auto object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Payment Verification Section */}
                    <div className="border-t pt-6 mt-6">
                      <h3 className="text-lg font-playfair text-ghibli-dark mb-4">
                        Verify Your Payment
                      </h3>
                      
                      {/* Warning message */}
                      <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md">
                        <p className="text-sm text-red-700 font-medium">Important Notice:</p>
                        <p className="text-xs text-red-600 mt-1">
                          Any use of fake screenshots or fraudulent transaction IDs will result in your account being permanently banned. All payments are verified automatically.
                        </p>
                      </div>
                      
                      {/* Screenshot Upload */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-ghibli-dark mb-1">
                          Upload Payment Screenshot
                        </label>
                        
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="hidden"
                        />
                        
                        {!previewUrl ? (
                          <div 
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-300 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-8 w-8 mx-auto text-ghibli-dark/50 mb-2" />
                            <p className="text-sm text-ghibli-dark">
                              Click to upload screenshot
                            </p>
                            <p className="text-xs text-ghibli-dark/70 mt-1">
                              JPG, PNG or GIF (max 5MB)
                            </p>
                          </div>
                        ) : (
                          <div className="relative border rounded-lg overflow-hidden">
                            <img
                              src={previewUrl}
                              alt="Payment Screenshot"
                              className="w-full h-auto max-h-48 object-contain"
                            />
                            <button
                              className="absolute top-2 right-2 bg-white/80 rounded-full p-1 hover:bg-white/100 transition-colors"
                              onClick={() => {
                                setScreenshot(null);
                                setPreviewUrl(null);
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = "";
                                }
                              }}
                            >
                              <X className="h-4 w-4 text-ghibli-dark" />
                            </button>
                          </div>
                        )}

                        {/* Screenshot examples guide */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-medium text-ghibli-dark mb-2">
                            Screenshot Guide:
                          </p>
                          <p className="text-xs text-ghibli-dark/80 mt-2 font-medium">
                            <span className="text-blue-700">Important: Do not crop your screenshots as verification will fail for any cropped out screenshots. We don't store your screenshots after verification.</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 mt-6">
                        <Button
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-medium"
                          onClick={handleVerifyPayment}
                          disabled={submittingVerification || !screenshot}
                        >
                          {submittingVerification ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying Payment...
                            </>
                          ) : (
                            "Verify Payment"
                          )}
                        </Button>
                        
                        <Button
                          className="bg-gray-100 hover:bg-gray-200 text-ghibli-dark py-2 rounded-lg font-medium"
                          onClick={handleReset}
                          disabled={submittingVerification}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Step 3: Verification Complete */
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    
                    <h2 className="text-xl font-playfair text-ghibli-dark mb-2">
                      Payment Verified!
                    </h2>
                    
                    <p className="text-ghibli-dark/80 mb-6 max-w-md mx-auto">
                      Your payment has been verified and credits have been added to your account.
                    </p>
                    
                    <div className="flex justify-center gap-4">
                      <Button
                        className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-lg font-medium"
                        onClick={handleGoHome}
                      >
                        Return to Home
                      </Button>
                      
                      <Button
                        className="bg-white border border-gray-200 hover:bg-gray-50 text-ghibli-dark py-2 px-6 rounded-lg font-medium"
                        onClick={handleReset}
                      >
                        Make Another Payment
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Information Box */}
              <div className="max-w-2xl mx-auto">
                <div className="bg-amber-50 rounded-lg p-4 text-sm text-ghibli-dark/80">
                  <p className="font-medium text-ghibli-dark mb-2">Payment Information</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Payments are verified automatically via screenshot</li>
                    <li>Your payment must be completed within the countdown time</li>
                    <li>For any issues, contact ghiblit@gmail.com</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}