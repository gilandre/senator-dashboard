"use client"

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { TOAST_CONFIG } from "@/lib/constants"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, duration, ...props }) {
        return (
          <Toast 
            key={id} 
            {...props}
            duration={duration}
            className="animate-in slide-in-from-top-full data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full"
            style={{
              animationDuration: `${TOAST_CONFIG.ANIMATION_DURATION}ms`,
            }}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport 
        className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
      />
    </ToastProvider>
  )
} 