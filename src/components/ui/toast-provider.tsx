"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { 
  Toast, 
  ToastProvider as RadixToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose
} from './toast'

type ToastType = 'success' | 'error'

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ 
    message: string; 
    type: ToastType;
    duration?: number;
  } | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  const handleCloseToast = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => setToast(null), 300) // Clear after fade out
  }, [])

  const showToast = useCallback((message: string, type: ToastType, duration = 3000) => {
    setToast({ message, type, duration })
    setIsVisible(true)
    
    // Auto dismiss
    setTimeout(() => {
      handleCloseToast()
    }, duration)
  }, [handleCloseToast])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <RadixToastProvider>
        {toast && isVisible && (
          <Toast 
            variant={toast.type === 'error' ? 'destructive' : 'default'}
            open={isVisible}
            onOpenChange={setIsVisible}
          >
            <ToastClose onClick={handleCloseToast} />
            <ToastTitle>{toast.type === 'success' ? 'Succès' : 'Erreur'}</ToastTitle>
            <ToastDescription>{toast.message}</ToastDescription>
          </Toast>
        )}
        <ToastViewport />
      </RadixToastProvider>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
} 