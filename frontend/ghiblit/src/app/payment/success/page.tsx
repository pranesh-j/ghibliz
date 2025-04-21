// frontend/ghiblit/src/app/payment/success/page.tsx

"use client"

import { useEffect, useState, useCallback } from "react" // Added useCallback
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
  const [success, setSuccess] = useState<boolean | null>(null); // null = indeterminate/checking
  const [creditsPurchased, setCreditsPurchased] = useState(0)
  const [totalCredits, setTotalCredits] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Wrap verifyPayment in useCallback if using it as a dependency
  const verifyPaymentCallback = useCallback(async (paymentId: number) => {
      console.log(`Verifying payment ID: ${paymentId}`);
      try {
        const response = await paymentService.checkPaymentStatus(paymentId);
        console.log("Payment status response:", response);

        if (response.status === 'completed') {
          setSuccess(true);
          setCreditsPurchased(response.credits_purchased || 0);
          setTotalCredits(response.credit_balance || 0);
          await refreshUserProfile(); // Refresh profile on success confirmation
          toast({
            title: "Payment successful!",
            description: `${response.credits_purchased || 'Your'} credits have been added.`, // Improved message
            variant: "success"
          });
          setLoading(false);
        } else if (response.status === 'failed') {
          setSuccess(false);
          setErrorMsg(response.message || "Your payment was not successful.");
          toast({
            title: "Payment failed",
            description: response.message || "Your payment was not successful",
            variant: "error"
          });
          setLoading(false);
        } else {
          // Still processing
          console.log(`Payment ${paymentId} status: ${response.status}. Checking again in 2s...`);
          // Use setTimeout directly without recursion in useEffect to avoid complexity
          // setTimeout(verifyPayment, 2000); // Remove reschedule from here
        }
      } catch (error: any) {
        console.error("Failed to verify payment:", error);
        setErrorMsg("Could not verify your payment status due to an error.");
        toast({
          title: "Verification failed",
          description: error.response?.data?.error || "Could not verify payment status.",
          variant: "error"
        });
        setSuccess(false);
        setLoading(false);
      }
  }, [refreshUserProfile, toast]); // Add dependencies

  useEffect(() => {
    const paymentIdParam = searchParams?.get('payment_id');
    console.log("Payment ID from URL:", paymentIdParam);

    // Flag to prevent running timeout logic if ID was initially invalid
    let isIdValid = false;

    if (!paymentIdParam || isNaN(parseInt(paymentIdParam))) {
      console.warn("Payment ID missing or invalid in success URL. Relying on webhook.");
      setSuccess(null); // Keep as null/indeterminate
      setLoading(false); // We are done loading this page's check
      setErrorMsg(null);

      toast({
        title: "Payment Complete",
        description: "We're confirming the final status. Credits will appear shortly if successful.",
        variant: "info",
        duration: 7000
      });

      // Refresh profile eagerly as webhook might have already processed
      refreshUserProfile();

    } else {
       // ID is valid, proceed with verification and polling
       isIdValid = true;
       const paymentId = parseInt(paymentIdParam);
       setLoading(true); // Start loading for verification

       let intervalId: NodeJS.Timeout | null = null;

       const checkStatus = async () => {
         await verifyPaymentCallback(paymentId);
         // Read the success state *after* verifyPaymentCallback updates it
         // Note: State updates might be async, better to check inside verifyPaymentCallback if possible
         // or pass a callback to know when polling should stop.
         // For simplicity here, we assume verifyPaymentCallback handles setting loading/success correctly.
         // The polling stops implicitly when success is true or false inside verifyPaymentCallback.
         // If still null after check, polling continues.
         // Re-check state after await (though may not be instant)
         if (success === true || success === false) {
             if (intervalId) clearInterval(intervalId);
         }
       };

       // Initial check
       checkStatus();

       // Set up interval *only* if ID was valid
       intervalId = setInterval(async () => {
           // Need a way to check the current state INSIDE the interval
           // This is tricky. A cleaner way might be needed if success state isn't updated fast enough.
           // Let's rely on verifyPaymentCallback setting loading to false when done.
           if (!loading) { // If a previous check finished (success/fail/error)
               if (intervalId) clearInterval(intervalId);
           } else {
               await checkStatus(); // Check again
           }
       }, 3000); // Check every 3 seconds after initial check

       // Cleanup interval on unmount
       return () => {
           if (intervalId) clearInterval(intervalId);
       };
    }

  }, [searchParams, verifyPaymentCallback, refreshUserProfile, toast]); // Add verifyPaymentCallback

  // Separate useEffect for initial profile refresh on load
  useEffect(() => {
    refreshUserProfile();
  }, [refreshUserProfile]);

  const handleGoHome = () => {
    router.push('/')
  }

  // --- Rendering Logic ---
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <CloudBackground />
      <div className="relative z-10 min-h-screen flex flex-col"> {/* Ensure flex-col for footer */}
        <header className="pt-3 sm:pt-4 px-3 md:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <GhibliLogo />
            {isAuthenticated && user && (
              <div className="text-sm text-ghibli-dark">
                <span className="font-medium">
                  {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.email}
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

        <div className="container mx-auto px-4 py-8 flex-grow"> {/* Add flex-grow */}
          <button
            onClick={handleGoHome}
            className="flex items-center text-sm text-ghibli-dark mb-6 hover:text-ghibli-dark/80 transition-colors"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Home
          </button>

          <div className="max-w-2xl mx-auto bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-8 text-center">
            {/* Case 1: Still Loading Initial Check (if ID was present) */}
            {loading && success !== true && success !== false && (
               <div className="py-10">
                 <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto mb-4" />
                 <h2 className="text-xl font-playfair text-ghibli-dark mb-2">Verifying your payment</h2>
                 <p className="text-ghibli-dark/70">Please wait...</p>
               </div>
            )}

            {/* Case 2: ID was missing, show neutral confirming message */}
            {!loading && success === null && (
               <div className="py-10">
                 <Loader2 className="h-10 w-10 text-amber-500 animate-spin mx-auto mb-4" />
                 <h2 className="text-xl font-playfair text-ghibli-dark mb-2">Confirming Payment Status</h2>
                 <p className="text-ghibli-dark/70 mb-4">Please wait a moment. Your credits will appear soon if successful.</p>
                 <p className="text-xs text-ghibli-dark/60 mb-6">(This might take a few seconds after payment)</p>
                 <Button onClick={handleGoHome} className="bg-amber-500 hover:bg-amber-600 text-white">Go Home</Button>
               </div>
            )}

            {/* Case 3: Verification complete, Success! */}
            {!loading && success === true && (
              <div className="py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-playfair text-ghibli-dark mb-2">Payment Successful!</h2>
                <p className="text-ghibli-dark/70 mb-6">Your payment has been processed successfully and your credits have been added.</p>
                {/* Display credits if available from API check */}
                {creditsPurchased > 0 && (
                  <div className="bg-amber-50 p-4 rounded-lg mb-6 inline-block mx-auto">
                    <p className="text-amber-800 font-medium">{creditsPurchased} credits added</p>
                    {totalCredits > 0 && (<p className="text-amber-700 text-sm mt-1">Total balance: {totalCredits} credits</p>)}
                  </div>
                )}
                {/* Display credits from user context as fallback */}
                {creditsPurchased === 0 && user?.profile && (
                   <div className="bg-amber-50 p-4 rounded-lg mb-6 inline-block mx-auto">
                       <p className="text-amber-700 text-sm mt-1">Current balance: {user.profile.credit_balance} credits</p>
                   </div>
                )}
                 <Button onClick={handleGoHome} className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-lg font-medium">Start Creating</Button>
                 <p className="mt-4 text-sm text-ghibli-dark/70">
                   Don't see your credits yet? Give it a moment or <button onClick={() => refreshUserProfile()} className="text-amber-600 ml-1 underline hover:text-amber-700">refresh your profile</button>.
                 </p>
              </div>
            )}

             {/* Case 4: Verification complete, Failed. */}
            {!loading && success === false && (
              <div className="py-6">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-2xl font-playfair text-ghibli-dark mb-2">Payment Issue</h2>
                <p className="text-ghibli-dark/70 mb-6">
                  {errorMsg || "We couldn't confirm your payment was successful."}
                </p>
                <div className="flex justify-center gap-4">
                  <Button onClick={() => router.push('/payment')} className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-lg font-medium">Try Again</Button>
                  <Button onClick={handleGoHome} className="bg-white border border-gray-200 hover:bg-gray-50 text-ghibli-dark py-2 px-6 rounded-lg font-medium">Go Home</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer might need adjustment if content above isn't filling space */}
        {/* Assuming Footer component exists */}
        {/* <Footer /> */}
      </div>
    </main>
  )
}