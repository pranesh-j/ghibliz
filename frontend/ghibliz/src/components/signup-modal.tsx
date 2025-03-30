"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/components/ui/toast"

interface SignupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSwitchToLogin: () => void
}

export function SignupModal({ open, onOpenChange, onSwitchToLogin }: SignupModalProps) {
  const { googleLogin, loading } = useAuth()
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignup = async () => {
    try {
      // In a production app, you'd use a proper OAuth flow like Google Identity Services
      // This is a simplified version that assumes your backend has Google OAuth integration
      
      setError(null)
      const mockGoogleToken = "google-mock-token"
      await googleLogin(mockGoogleToken)
      
      toast({
        title: "Account created",
        description: "Welcome to Ghibliz!",
        variant: "success"
      })
      
      onOpenChange(false)
    } catch (err) {
      console.error("Google signup error:", err)
      
      setError("Failed to signup with Google. Please try again.")
      
      toast({
        title: "Signup failed",
        description: "There was a problem creating your account with Google",
        variant: "error"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-amber-50 border-none rounded-xl shadow-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-playfair text-ghibli-dark text-center">Join Ghibliz</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="mb-4 text-center">
            <p className="text-ghibli-dark mb-6">
              Create your account with Google to get unlimited testing access to Ghibliz.
            </p>
          </div>

          <Button
            className="w-full border border-ghibli-dark/20 bg-white text-ghibli-dark hover:bg-ghibli-dark/5 px-4 py-2 rounded-md flex items-center justify-center"
            onClick={handleGoogleSignup}
            disabled={loading}
            type="button"
          >
            {loading ? (
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></span>
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            Sign up with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}