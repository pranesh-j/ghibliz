"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"
import { GoogleLogin } from '@react-oauth/google'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToSignup: () => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const { googleLogin, loading } = useAuth()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    try {
      setError(null)
      await googleLogin(credentialResponse.credential)
      
      toast({
        title: "Login successful",
        description: "Welcome to Ghiblit!",
        variant: "success"
      })
      
      onOpenChange(false)
    } catch (err: any) {
      console.error("Google login error:", err)
      
      setError("Failed to login with Google. Please try again.")
      
      toast({
        title: "Login failed",
        description: "There was a problem signing in with Google",
        variant: "error"
      })
    }
  }

  const handleGoogleLoginError = () => {
    setError("Google sign-in was unsuccessful. Please try again.")
    
    toast({
      title: "Login failed",
      description: "Google authentication was canceled or failed",
      variant: "error"
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-amber-50 border-none rounded-xl shadow-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair text-ghibli-dark text-center">Welcome to Ghiblit</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mb-8 text-center">
            <p className="text-ghibli-dark mb-2">
              Sign in with your Google account to get unlimited access to Ghiblit.
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
                text="signin_with"
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