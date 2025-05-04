"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function ToastTestPage() {
  const { toast } = useToast()

  return (
    <>
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-bold">Toast Test Page</h1>
        
        <div className="flex gap-4">
          <Button 
            onClick={() => 
              toast({
                title: "Success",
                description: "This is a success toast",
                variant: "default",
              })
            }
            className="bg-green-600 hover:bg-green-700"
          >
            Show Success Toast
          </Button>
          
          <Button 
            onClick={() => 
              toast({
                title: "Error",
                description: "This is an error toast",
                variant: "destructive",
              })
            }
            className="bg-red-600 hover:bg-red-700"
          >
            Show Error Toast
          </Button>
        </div>
      </div>
      <Toaster />
    </>
  )
} 