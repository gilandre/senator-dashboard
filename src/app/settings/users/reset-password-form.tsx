"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, KeyRound, Shield, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"

// Schéma de validation pour le formulaire de réinitialisation de mot de passe
const passwordResetSchema = z.object({
  userId: z.string(),
  generateRandom: z.boolean().default(true),
  password: z.string().optional(),
  requirePasswordChange: z.boolean().default(true),
  sendEmail: z.boolean().default(true),
})
.refine(data => {
  // Si generateRandom est false, alors password doit être spécifié et valide
  if (!data.generateRandom && (!data.password || data.password.length < 8)) {
    return false
  }
  return true
}, {
  message: "Le mot de passe doit contenir au moins 8 caractères",
  path: ["password"],
})

type PasswordResetFormData = z.infer<typeof passwordResetSchema>

interface ResetPasswordFormProps {
  user: { id: string; name: string; email: string };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  securitySettings?: any;
}

export function ResetPasswordForm({ 
  user, 
  onSubmit, 
  onCancel, 
  isLoading = false,
  securitySettings 
}: ResetPasswordFormProps) {
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  
  // Valeurs par défaut basées sur les paramètres de sécurité
  const defaultValues: PasswordResetFormData = {
    userId: user.id,
    generateRandom: true,
    password: "",
    requirePasswordChange: true,
    sendEmail: true,
  }

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues,
  })

  // Observer les changements sur le champ generateRandom
  const generateRandom = watch("generateRandom")

  // Fonction pour générer un mot de passe aléatoire fort
  const generateRandomPassword = () => {
    const length = securitySettings?.passwordMinLength || 12
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const lowercase = "abcdefghijklmnopqrstuvwxyz"
    const numbers = "0123456789"
    const special = "!@#$%^&*()_+[]{}|;:,.<>?"
    
    let chars = ""
    
    // Ajouter les ensembles de caractères en fonction des exigences de sécurité
    if (securitySettings?.passwordRequireUppercase) chars += uppercase
    if (securitySettings?.passwordRequireLowercase || true) chars += lowercase
    if (securitySettings?.passwordRequireNumbers) chars += numbers
    if (securitySettings?.passwordRequireSpecial) chars += special
    
    // Ajouter des ensembles par défaut si aucun paramètre n'est activé
    if (chars.length === 0) {
      chars = uppercase + lowercase + numbers + special
    }

    let password = ""
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // S'assurer que le mot de passe contient au moins un caractère de chaque ensemble requis
    let hasUpper = !securitySettings?.passwordRequireUppercase || /[A-Z]/.test(password)
    let hasLower = !securitySettings?.passwordRequireLowercase || /[a-z]/.test(password)
    let hasNumber = !securitySettings?.passwordRequireNumbers || /[0-9]/.test(password)
    let hasSpecial = !securitySettings?.passwordRequireSpecial || /[^A-Za-z0-9]/.test(password)
    
    // Si une contrainte n'est pas respectée, remplacer un caractère aléatoire
    if (!hasUpper) {
      const pos = Math.floor(Math.random() * length)
      password = password.substring(0, pos) + uppercase.charAt(Math.floor(Math.random() * uppercase.length)) + password.substring(pos + 1)
    }
    if (!hasLower) {
      const pos = Math.floor(Math.random() * length)
      password = password.substring(0, pos) + lowercase.charAt(Math.floor(Math.random() * lowercase.length)) + password.substring(pos + 1)
    }
    if (!hasNumber) {
      const pos = Math.floor(Math.random() * length)
      password = password.substring(0, pos) + numbers.charAt(Math.floor(Math.random() * numbers.length)) + password.substring(pos + 1)
    }
    if (!hasSpecial) {
      const pos = Math.floor(Math.random() * length)
      password = password.substring(0, pos) + special.charAt(Math.floor(Math.random() * special.length)) + password.substring(pos + 1)
    }
    
    setValue("password", password)
    setShowPassword(true)
  }

  // Gérer la soumission du formulaire
  const handleFormSubmit = async (data: PasswordResetFormData) => {
    try {
      // Si un mot de passe aléatoire doit être généré et aucun n'a été fourni
      if (data.generateRandom && (!data.password || data.password.trim() === "")) {
        generateRandomPassword()
        return
      }
      
      // Appeler la fonction de soumission fournie par le parent
      await onSubmit(data)
      
      // Afficher un toast de succès
      toast({
        title: "Mot de passe réinitialisé",
        description: `Le mot de passe de ${user.name} a été réinitialisé avec succès.`,
        variant: "default"
      })
    } catch (error: any) {
      console.error("Erreur lors de la réinitialisation du mot de passe:", error)
      
      // Afficher un toast d'erreur avec des détails si disponibles
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Une erreur est survenue lors de la réinitialisation du mot de passe.",
        variant: "destructive"
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Réinitialiser le mot de passe</CardTitle>
          <CardDescription>
            Réinitialiser le mot de passe pour {user.name} ({user.email})
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex flex-col space-y-1">
              <h4 className="font-medium leading-none">Générer un mot de passe aléatoire</h4>
              <p className="text-sm text-muted-foreground">
                Générer automatiquement un mot de passe fort et sécurisé
              </p>
            </div>
            <Switch
              {...register("generateRandom")}
              checked={generateRandom}
              onCheckedChange={(checked) => setValue("generateRandom", checked)}
              disabled={isLoading}
            />
          </div>
          
          {!generateRandom && (
            <div className="space-y-2">
              <Label htmlFor="custom-password">Mot de passe personnalisé</Label>
              <div className="relative">
                <Input 
                  id="custom-password" 
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  disabled={isLoading}
                  className={errors.password ? "border-red-500" : ""}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
              
              {/* Exigences de sécurité */}
              <div className="mt-2 text-xs text-muted-foreground space-y-1">
                <p className="font-medium">Exigences de sécurité:</p>
                <ul className="list-disc list-inside pl-2 space-y-1">
                  <li className={securitySettings?.passwordMinLength ? "text-green-600" : ""}>
                    Au moins {securitySettings?.passwordMinLength || 12} caractères
                  </li>
                  {securitySettings?.passwordRequireUppercase && (
                    <li>Au moins une lettre majuscule</li>
                  )}
                  {securitySettings?.passwordRequireNumbers && (
                    <li>Au moins un chiffre</li>
                  )}
                  {securitySettings?.passwordRequireSpecial && (
                    <li>Au moins un caractère spécial</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          
          <Separator />
          
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex flex-col space-y-1">
              <h4 className="font-medium leading-none">Imposer le changement au premier login</h4>
              <p className="text-sm text-muted-foreground">
                L'utilisateur sera obligé de changer son mot de passe à sa prochaine connexion
              </p>
            </div>
            <Switch
              {...register("requirePasswordChange")}
              defaultChecked={true}
              disabled={isLoading}
            />
          </div>
          
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex flex-col space-y-1">
              <h4 className="font-medium leading-none">Envoyer par email</h4>
              <p className="text-sm text-muted-foreground">
                Envoyer les informations de réinitialisation par email à l'utilisateur
              </p>
            </div>
            <Switch
              {...register("sendEmail")}
              defaultChecked={true}
              disabled={isLoading}
            />
          </div>
          
          {/* Afficher le mot de passe généré si disponible */}
          {generateRandom && watch("password") && (
            <div className="rounded-lg border p-4 bg-muted">
              <div className="flex items-center space-x-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Mot de passe généré:</h4>
              </div>
              <div className="mt-2 font-mono text-sm bg-background p-2 rounded flex items-center justify-between">
                <span>{watch("password")}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(watch("password") || "")}
                >
                  Copier
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3 inline-block mr-1" />
                Ce mot de passe est conforme aux exigences de sécurité du système.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {generateRandom && !watch("password") ? "Générer" : "Réinitialiser"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
} 