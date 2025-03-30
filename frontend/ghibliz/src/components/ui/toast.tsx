// src/components/ui/toast.tsx
"use client"

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { X } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  title?: string
  description?: string
  variant: ToastVariant
  duration: number
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Toast variants styling
const variants: Record<ToastVariant, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(({ 
    title, 
    description, 
    variant = 'info', 
    duration = 5000 
  }: ToastOptions): string => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setToasts((prev) => [
      ...prev,
      { id, title, description, variant, duration }
    ]);

    // Auto-remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);

    return id;
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3 rounded-lg shadow-md border transition-all duration-300 flex items-start ${variants[toast.variant]}`}
              role="alert"
              aria-live="assertive"
            >
              <div className="flex-1">
                {toast.title && (
                  <h4 className="font-medium text-sm">{toast.title}</h4>
                )}
                {toast.description && (
                  <p className="text-xs mt-1 opacity-90">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="ml-2 p-1 hover:bg-black/5 rounded-full"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}