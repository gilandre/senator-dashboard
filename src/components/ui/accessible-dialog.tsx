"use client"

import * as React from "react"
import { 
  Dialog, 
  DialogContent as BaseDialogContent, 
  DialogDescription, 
  DialogTitle 
} from "@/components/ui/dialog"
import { VisuallyHidden } from "@/components/ui/visually-hidden"

interface AccessibleDialogContentProps extends React.ComponentPropsWithoutRef<typeof BaseDialogContent> {
  title: string
  description?: string
  hideTitle?: boolean
}

/**
 * An accessible DialogContent component that automatically includes a DialogTitle
 * and optionally a DialogDescription. Use this component instead of DialogContent
 * to ensure proper accessibility.
 */
export function AccessibleDialogContent({
  children,
  title,
  description,
  hideTitle = false,
  ...props
}: AccessibleDialogContentProps) {
  return (
    <BaseDialogContent {...props}>
      {hideTitle ? (
        <VisuallyHidden>
          <DialogTitle>{title}</DialogTitle>
        </VisuallyHidden>
      ) : (
        <DialogTitle>{title}</DialogTitle>
      )}
      
      {description && <DialogDescription>{description}</DialogDescription>}
      
      {children}
    </BaseDialogContent>
  )
}

export { Dialog } 