"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CloudBackground } from "@/components/cloud-background"
import { GhibliLogo } from "@/components/ghibli-logo"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import paymentService from "@/services/paymentService"

interface PricingPlan {
  id: number;
  name: string;
  credits: number;
  price_inr: number;
  is_active: boolean;
}

export default function PaymentPage() {
  const { user, isAuthenticated, refreshUserProfile } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingPayment, setCreatingPayment] = useState(false)
  
  // Payment status checking
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Load pricing plans on component mount
  useEffect(() => {
    const fetchPricingPlans = async () => {
      try {
        setLoading(true)
        const plans = await paymentService.getPricingPlans()
        setPricingPlans(plans)
        
        // Auto-select first plan
        if (plans.length > 0) {
          setSelectedPlan(plans[0])
        }
      } catch (error) {
        console.error("Failed to load pricing plans:", error)
        toast({
          title: "Failed to load packages",
          description: "Please try again later",
          variant: "error"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchPricingPlans()
    
    // Clean up interval when component unmounts
    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current)
      }
    }
  }, [toast])
  
  // Check authentication
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
  
  // Function to initiate payment
  const handleCreatePayment = async () => {
    if (!selectedPlan) {
      toast({
        title: "Select a package",
        description: "Please select a package to continue",
        variant: "warning"
      })
      return
    }
    
    try {
      setCreatingPayment(true)
      const paymentResponse = await paymentService.createPayment(selectedPlan.id)
      
      // Start checking payment status
      setCurrentPaymentId(paymentResponse.payment_id)
      
      // Redirect to payment page
      window.location.href = paymentResponse.payment_url
    } catch (error: any) {
      console.error("Payment creation failed:", error)
      toast({
        title: "Payment initialization failed",
        description: error.response?.data?.error || "Please try again later",
        variant: "error"
      })
    } finally {
      setCreatingPayment(false)
    }
  }
  
  // Function to check payment status
  const checkPaymentStatus = async () => {
    if (!currentPaymentId) return
    
    try {
      setCheckingStatus(true)
      const statusResponse = await paymentService.checkPaymentStatus(currentPaymentId)
      
      if (statusResponse.status === 'completed') {
        // Payment successful
        toast({
          title: "Payment successful!",
          description: `${statusResponse.credits_purchased} credits have been added to your account`,
          variant: "success"
        })
        
        // Stop checking status
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current)
        }
        
        // Refresh user profile to get updated credit balance
        await refreshUserProfile()
        
        // Redirect to home page after successful payment
        router.push('/')
      } else if (statusResponse.status === 'failed') {
        // Payment failed
        toast({
          title: "Payment failed",
          description: statusResponse.message || "Your payment was not successful",
          variant: "error"
        })
        
        // Stop checking status
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current)
        }
        
        setCurrentPaymentId(null)
      }
      // For 'pending' or 'processing', we continue to wait
    } catch (error) {
      console.error("Failed to check payment status:", error)
    } finally {
      setCheckingStatus(false)
    }
  }
  
  // Set up interval to check payment status
  useEffect(() => {
    if (currentPaymentId) {
      // Check immediately
      checkPaymentStatus()
      
      // Set up interval to check every 5 seconds
      statusCheckIntervalRef.current = setInterval(checkPaymentStatus, 5000)
      
      return () => {
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current)
        }
      }
    }
  }, [currentPaymentId])

  const handleGoHome = () => {
    router.push('/')
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <CloudBackground />

      <div className="relative z-10 min-h-screen">
        <header className="pt-3 sm:pt-4 px-3 md:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
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

        <div className="container mx-auto px-4 py-8">
          <button
            onClick={handleGoHome}
            className="flex items-center text-sm text-ghibli-dark mb-6 hover:text-ghibli-dark/80 transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </button>

          <h1 className="text-3xl md:text-4xl font-playfair text-ghibli-dark mb-6 text-center">
            Buy Credits
          </h1>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 text-ghibli-dark animate-spin" />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8">
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

              {/* Payment Processing Info */}
              {currentPaymentId && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-700">
                        Payment Processing
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {checkingStatus ? (
                          <span className="flex items-center">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Checking payment status...
                          </span>
                        ) : (
                          "Complete the payment in the browser window that opened."
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Information Box */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-amber-50 rounded-lg p-4 text-sm text-ghibli-dark/80">
              <p className="font-medium text-ghibli-dark mb-2">Payment Information</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your payment is processed securely by Dodo Payments</li>
                <li>Credits will be added to your account automatically after payment</li>
                <li>For any issues, contact support@ghiblit.art</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}