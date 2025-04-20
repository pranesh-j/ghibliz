// frontend/ghiblit/src/app/payment/success/page.tsx

"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Loader2, ArrowLeft, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CloudBackground } from "@/components/cloud-background"
import { GhibliLogo } from "@/components/ghibli-logo"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import paymentService from "@/services/paymentService"

export default function PaymentSuccessPage() {
  const { refreshUserProfile, user, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [creditsPurchased, setCreditsPurchased] = useState(0)
  const [totalCredits, setTotalCredits] = useState(0)
  
  useEffect(() => {
    const paymentId = searchParams?.get('payment_id')
    const status = searchParams?.get('status')
    
    if (!paymentId) {
      // No payment ID in URL, redirect to home
      router.push('/')
      return
    }
    
    // If status is already provided in the URL
    if (status === 'succeeded') {
      setSuccess(true)
      setLoading(false)
      refreshUserProfile();
      toast({
        title: "Payment successful!",
        description: "Your credits have been added to your account",
        variant: "success"
      })
      return;
    }
    
    const verifyPayment = async () => {
      try {
        setLoading(true)
        const response = await paymentService.checkPaymentStatus(parseInt(paymentId))
        
        if (response.status === 'completed') {
          setSuccess(true)
          setCreditsPurchased(response.credits_purchased || 0)
          setTotalCredits(response.credit_balance || 0)
          
          // Refresh user profile to update credit balance
          await refreshUserProfile()
          
          toast({
            title: "Payment successful!",
            description: `${response.credits_purchased} credits have been added to your account`,
            variant: "success"
          })
        } else if (response.status === 'failed') {
          setSuccess(false)
          toast({
            title: "Payment failed",
            description: response.message || "Your payment was not successful",
            variant: "error"
          })
        } else {
          // Payment still processing, wait and check again
          setTimeout(verifyPayment, 2000)
        }
      } catch (error) {
        console.error("Failed to verify payment:", error)
        toast({
          title: "Verification failed",
          description: "Could not verify your payment status",
          variant: "error"
        })
        setSuccess(false)
      } finally {
        setLoading(false)
      }
    }
    
    verifyPayment()
  }, [router, searchParams, toast, refreshUserProfile])
  
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
          
          <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-8 text-center">
            {loading ? (
              <div className="py-10">
                <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-playfair text-ghibli-dark mb-2">
                  Verifying your payment
                </h2>
                <p className="text-ghibli-dark/70">
                  Please wait while we confirm your payment status...
                </p>
              </div>
            ) : success ? (
              <div className="py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                
                <h2 className="text-2xl font-playfair text-ghibli-dark mb-2">
                  Payment Successful!
                </h2>
                
                <p className="text-ghibli-dark/70 mb-6">
                  Your payment has been processed successfully and your credits have been added.
                </p>
                
                {creditsPurchased > 0 && (
                  <div className="bg-amber-50 p-4 rounded-lg mb-6 inline-block mx-auto">
                    <p className="text-amber-800 font-medium">
                      {creditsPurchased} credits added to your account
                    </p>
                    {totalCredits > 0 && (
                      <p className="text-amber-700 text-sm mt-1">
                        Total balance: {totalCredits} credits
                      </p>
                    )}
                  </div>
                )}
                
                <Button
                  className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-lg font-medium"
                  onClick={handleGoHome}
                >
                  Start Creating
                </Button>
              </div>
            ) : (
              <div className="py-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                
                <h2 className="text-2xl font-playfair text-ghibli-dark mb-2">
                  Payment Issue
                </h2>
                
                <p className="text-ghibli-dark/70 mb-6">
                  We couldn't confirm your payment was successful. If you believe this is an error, please contact support.
                </p>
                
                <div className="flex justify-center gap-4">
                  <Button
                    className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-lg font-medium"
                    onClick={() => router.push('/payment')}
                  >
                    Try Again
                  </Button>
                  
                  <Button
                    className="bg-white border border-gray-200 hover:bg-gray-50 text-ghibli-dark py-2 px-6 rounded-lg font-medium"
                    onClick={handleGoHome}
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}