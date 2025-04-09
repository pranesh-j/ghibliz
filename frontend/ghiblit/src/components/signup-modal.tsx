"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import { GoogleLogin } from '@react-oauth/google'

interface SignupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToLogin: () => void
}

export function SignupModal({ open, onOpenChange, onSwitchToLogin }: SignupModalProps) {
  const { googleLogin, loading } = useAuth()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    try {
      setError(null)
      await googleLogin(credentialResponse.credential)
      
      toast({
        title: "Account created",
        description: "Welcome to Ghiblit.art!",
        variant: "success"
      })
      
      onOpenChange(false)
    } catch (err: any) {
      console.error("Google signup error:", err)
      
      setError("Failed to signup with Google. Please try again.")
      
      toast({
        title: "Signup failed",
        description: "There was a problem creating your account with Google",
        variant: "error"
      })
    }
  }

  const handleGoogleLoginError = () => {
    setError("Google sign-in was unsuccessful. Please try again.")
    
    toast({
      title: "Signup failed",
      description: "Google authentication was canceled or failed",
      variant: "error"
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-amber-50 border-none rounded-xl shadow-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair text-ghibli-dark text-center">Join Ghiblit</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 text-center">
            <p className="text-ghibli-dark mb-6">
            Sign up with your Google account to get unlimited access to Ghiblit.
            </p>
          </div>

          <div className="flex justify-center mb-4">
            {loading ? (
              <Button disabled className="px-4 py-2 flex items-center justify-center">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></span>
                Loading...
              </Button>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleLoginSuccess}
                onError={handleGoogleLoginError}
                useOneTap
                theme="outline"
                size="large"
                text="signup_with"
                shape="rectangular"
              />
            )}
          </div>
          
          <p className="text-xs text-center text-ghibli-dark/60 mt-4">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}