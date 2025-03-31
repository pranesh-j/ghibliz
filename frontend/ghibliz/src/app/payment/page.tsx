"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, QrCode, Smartphone, Upload, X, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CloudBackground } from "@/components/cloud-background"
import { GhibliLogo } from "@/components/ghibli-logo"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"

// This is a simplified version since we don't have a real backend yet
interface PricingPlan {
  id: number;
  name: string;
  credits: number;
  price_inr: number;
  is_active: boolean;
}

interface Payment {
  id: number;
  amount: number;
  currency: string;
  credits_purchased: number;
  payment_method: string;
  transaction_id?: string;
  status: string;
  created_at: string;
}

export default function PaymentPage() {
  const { user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Set the exact pricing plans you want
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
  const [currentPayment, setCurrentPayment] = useState<Payment | null>(null)
  const [paymentMode, setPaymentMode] = useState<'link' | 'qr'>('link') // Changed default to 'link'
  const [verifyMode, setVerifyMode] = useState<'screenshot' | 'transaction'>('screenshot') // Changed default to 'screenshot'
  const [transactionId, setTransactionId] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submittingVerification, setSubmittingVerification] = useState(false)
  const [verificationComplete, setVerificationComplete] = useState(false)
  
  // UPI details
  const upiId = "pran.eth@axl" // Your actual UPI ID
  const merchantName = "Ghibliz"
  
  // Create payment order
  const handleCreatePayment = async () => {
    if (!selectedPlan) return
    
    setCreatingPayment(true)
    try {
      // Mock API call
      setTimeout(() => {
        setCurrentPayment({
          id: Math.floor(Math.random() * 1000000),
          amount: selectedPlan.price_inr,
          currency: "INR",
          credits_purchased: selectedPlan.credits,
          payment_method: "upi",
          status: "pending",
          created_at: new Date().toISOString()
        });
        
        toast({
          title: "Payment initialized",
          description: "Complete the payment using UPI",
          variant: "success"
        });
        
        setCreatingPayment(false);
      }, 1000);
    } catch (error) {
      console.error("Failed to create payment:", error)
      toast({
        title: "Payment initialization failed",
        description: "Please try again",
        variant: "error"
      })
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
  
  // Handle verification submission
  const handleVerifyPayment = async () => {
    if (!currentPayment) return
    
    setSubmittingVerification(true)
    try {
      // Mock API call
      setTimeout(() => {
        setVerificationComplete(true)
        
        toast({
          title: "Verification submitted",
          description: "Your payment is being processed. Credits will be added soon.",
          variant: "success"
        })
        
        setSubmittingVerification(false)
      }, 1500)
    } catch (error) {
      console.error("Verification failed:", error)
      toast({
        title: "Verification failed",
        description: "Please check your information and try again",
        variant: "error"
      })
      setSubmittingVerification(false)
    }
  }
  
  // Generate QR code data for the current payment
  const getQrCodeData = () => {
    if (!currentPayment) return ''
    
    return `upi://pay?pa=${upiId}&pn=${merchantName}&am=${currentPayment.amount}&cu=INR&tn=Ghibliz_Payment_${currentPayment.id}`
  }
  
  // Reset the payment process
  const handleReset = () => {
    setCurrentPayment(null)
    setVerificationComplete(false)
    setTransactionId('')
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
                {!currentPayment ? (
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
                          {selectedPlan?.name} ({selectedPlan?.credits} credits)
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-ghibli-dark/80">Amount:</span>
                        <span className="text-sm font-medium text-ghibli-dark">
                          ₹{currentPayment.amount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-ghibli-dark/80">Order ID:</span>
                        <span className="text-sm font-medium text-ghibli-dark">
                          #{currentPayment.id}
                        </span>
                      </div>
                    </div>
                    
                    {/* Important notice about crediting */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-700">
                          After payment, you must verify by uploading a screenshot or providing the transaction ID. <span className="font-medium">Credits will be added only after verification is approved</span>.
                        </p>
                      </div>
                    </div>
                    
                    {/* Payment Method Toggle - Swapped order */}
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
                    
                    {/* UPI Link - Now first */}
                    {paymentMode === 'link' && (
                      <div className="mb-6">
                        <p className="text-sm text-center text-ghibli-dark mb-4">
                          Click the button below to open your UPI app
                        </p>
                        
                        <div className="flex justify-center mb-4">
                          <a
                            href={getQrCodeData()}
                            className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-lg font-medium text-base flex items-center"
                          >
                            <Smartphone className="mr-2 h-5 w-5" />
                            Proceed to UPI
                          </a>
                        </div>
                        
                        <div className="flex justify-center gap-6 items-center">
                          <a 
                            href={`upi://pay?pa=${upiId}&pn=Ghibliz&am=${currentPayment?.amount}&cu=INR&tn=Ghibliz_Payment_${currentPayment?.id || 'new'}`}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/gpay.svg"
                              alt="Google Pay"
                              width={180}
                              height={180}
                              className="h-16 w-auto object-contain" /* Doubled size */
                            />
                          </a>
                          <a 
                            href={`upi://pay?pa=${upiId}&pn=Ghibliz&am=${currentPayment?.amount}&cu=INR&tn=Ghibliz_Payment_${currentPayment?.id || 'new'}`}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/phonepe.svg"
                              alt="PhonePe"
                              width={180}
                              height={180}
                              className="h-16 w-auto object-contain" /* Doubled size */
                            />
                          </a>
                          <a 
                            href={`upi://pay?pa=${upiId}&pn=Ghibliz&am=${currentPayment?.amount}&cu=INR&tn=Ghibliz_Payment_${currentPayment?.id || 'new'}`}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/cred.svg"
                              alt="cred"
                              width={120}
                              height={120}
                              className="h-16 w-auto object-contain" /* Doubled size */
                            />
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {/* QR Code - Now second */}
                    {paymentMode === 'qr' && (
                      <div className="mb-6">
                        <div className="flex justify-center mb-4">
                          <div className="bg-white p-3 rounded-lg border">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getQrCodeData())}`}
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
                        <div className="flex justify-center gap-6 mb-1"> {/* Increased gap */}
                          <a 
                            href={`upi://pay?pa=${upiId}&pn=Ghibliz&am=${currentPayment?.amount}&cu=INR&tn=Ghibliz_Payment_${currentPayment?.id || 'new'}`}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/gpay.svg"
                              alt="Google Pay"
                              width={180}
                              height={180}
                              className="h-16 w-auto object-contain" /* Doubled size */
                            />
                          </a>
                          <a 
                            href={`upi://pay?pa=${upiId}&pn=Ghibliz&am=${currentPayment?.amount}&cu=INR&tn=Ghibliz_Payment_${currentPayment?.id || 'new'}`}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/phonepe.svg"
                              alt="PhonePe"
                              width={180}
                              height={180}
                              className="h-16 w-auto object-contain" /* Doubled size */
                            />
                          </a>
                          <a 
                            href={`upi://pay?pa=${upiId}&pn=Ghibliz&am=${currentPayment?.amount}&cu=INR&tn=Ghibliz_Payment_${currentPayment?.id || 'new'}`}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <img
                              src="/cred.svg"
                              alt="cred"
                              width={120}
                              height={120}
                              className="h-16 w-auto object-contain" /* Doubled size */
                            />
                          </a>
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
                          Any use of fake screenshots or fraudulent transaction IDs will result in your account being permanently banned. All payments are manually verified.
                        </p>
                      </div>
                      
                      {/* Verification Method Toggle - swapped order */}
                      <div className="flex border rounded-lg overflow-hidden mb-4">
                        <button
                          className={`flex-1 py-2 flex justify-center items-center ${
                            verifyMode === 'screenshot'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          } transition-colors`}
                          onClick={() => setVerifyMode('screenshot')}
                        >
                          Screenshot
                        </button>
                        <button
                          className={`flex-1 py-2 flex justify-center items-center ${
                            verifyMode === 'transaction'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          } transition-colors`}
                          onClick={() => setVerifyMode('transaction')}
                        >
                          Transaction ID
                        </button>
                      </div>
                      
                      {/* Screenshot Upload - now default/first */}
                      {verifyMode === 'screenshot' && (
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
                            <p className="text-xs text-ghibli-dark/80 mb-2">
                              Please capture the entire payment confirmation screen showing:
                            </p>
                            <ul className="text-xs text-ghibli-dark/80 list-disc pl-4 space-y-1">
                              <li>Transaction amount (₹{currentPayment.amount})</li>
                              <li>Transaction ID/Reference Number</li>
                              <li>Payment status (Successful)</li>
                              <li>Date and time of transaction</li>
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {/* Transaction ID Input - now second option */}
                      {verifyMode === 'transaction' && (
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-ghibli-dark mb-1">
                            Enter UPI Transaction ID
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                            placeholder="e.g. 123456789012"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                          />
                          
                          {/* Transaction ID guide */}
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs font-medium text-ghibli-dark mb-2">
                              Where to find your Transaction ID:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                              <div className="p-2 bg-white rounded border border-gray-200">
                                <p className="text-xs font-medium text-center mb-1">Google Pay</p>
                                <p className="text-xs text-center text-ghibli-dark/80">
                                  Check payment history → Select this transaction → Look for "UPI Reference ID"
                                </p>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-200">
                                <p className="text-xs font-medium text-center mb-1">PhonePe</p>
                                <p className="text-xs text-center text-ghibli-dark/80">
                                  Home → History → Select transaction → Find "Transaction ID"
                                </p>
                              </div>
                              <div className="p-2 bg-white rounded border border-gray-200">
                                <p className="text-xs font-medium text-center mb-1">CRED</p>
                                <p className="text-xs text-center text-ghibli-dark/80">
                                  UPI History → Select payment → Look for "Reference ID"
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-3 mt-6">
                        <Button
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg font-medium"
                          onClick={handleVerifyPayment}
                          disabled={
                            submittingVerification ||
                            (verifyMode === 'transaction' && !transactionId) ||
                            (verifyMode === 'screenshot' && !screenshot)
                          }
                        >
                          {submittingVerification ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
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
                      Payment Submitted!
                    </h2>
                    
                    <p className="text-ghibli-dark/80 mb-6 max-w-md mx-auto">
                      Your payment is being verified. Credits will be added to your account 
                      as soon as the payment is confirmed (usually within 24 hours).
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
                    <li>Payments are processed manually within 24 hours</li>
                    <li>Credits will be added to your account after verification</li>
                    <li>For any issues, contact support@ghibliz.com</li>
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