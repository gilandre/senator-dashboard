"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

function ToastDemo() {
  const { toast } = useToast()
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Toast Notifications</h2>
      <div className="flex gap-4">
        <Button
          onClick={() => 
            toast({
              title: "Success",
              description: "Operation completed successfully!",
              variant: "default",
            })
          }
        >
          Show Success Toast
        </Button>
        <Button
          onClick={() => 
            toast({
              title: "Error",
              description: "An error occurred!",
              variant: "destructive",
            })
          }
          variant="destructive"
        >
          Show Error Toast
        </Button>
      </div>
    </div>
  )
}

function DropdownDemo() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Dropdown Menu</h2>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>Open Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default function UITestPage() {
  return (
    <>
      <div className="container mx-auto py-10 space-y-8">
        <h1 className="text-3xl font-bold">UI Component Testing</h1>
        <ToastDemo />
        <DropdownDemo />
      </div>
      <Toaster />
    </>
  )
} 