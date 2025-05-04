"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { User } from "./columns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, AlertTriangle, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface UserFormProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onSave: (userData: any) => Promise<void> | void
}

interface Profile {
  id: string
  name: string
  description: string
}

export function UserForm({ user, isOpen, onClose, onSave }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [error, setError] = useState("")
  const [passwordRequirements, setPasswordRequirements] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    status: "active",
    profileId: ""
  })

  // Récupérer les profils actifs depuis l'API
  useEffect(() => {
    fetchProfiles()
    fetchPasswordRequirements()
  }, [])

  const fetchPasswordRequirements = async () => {
    try {
      const response = await axios.get('/api/security/settings')
      const securitySettings = response.data
      
      if (securitySettings && securitySettings.passwordPolicy) {
        const policy = securitySettings.passwordPolicy
        const requirements: string[] = [
          `Longueur minimale: ${policy.minLength} caractères`
        ]
        
        if (policy.requireUppercase) {
          requirements.push("Au moins une lettre majuscule (A-Z)")
        }
        
        if (policy.requireLowercase) {
          requirements.push("Au moins une lettre minuscule (a-z)")
        }
        
        if (policy.requireNumbers) {
          requirements.push("Au moins un chiffre (0-9)")
        }
        
        if (policy.requireSpecialChars) {
          requirements.push("Au moins un caractère spécial (!@#$%^&*)")
        }
        
        setPasswordRequirements(requirements)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des exigences de mot de passe:", error)
    }
  }

  const fetchProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const response = await axios.get('/api/profiles')
      console.log('Profils chargés:', response.data)
      
      // Filtrer les profils actifs côté client si nécessaire
      const activeProfiles = response.data.profiles ? 
        response.data.profiles.filter((profile: any) => profile.isActive !== false) : 
        [];
      
      setProfiles(activeProfiles || [])
      
      // Si aucun profil n'est défini et des profils sont disponibles, utiliser le premier profil par défaut
      if (!formData.profileId && activeProfiles && activeProfiles.length > 0) {
        setFormData(prev => ({ ...prev, profileId: activeProfiles[0].id }))
      }
    } catch (error) {
      console.error("Erreur lors du chargement des profils:", error)
      setError("Impossible de charger les profils. Veuillez réessayer.")
    } finally {
      setLoadingProfiles(false)
    }
  }

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: "", // Don't populate password field for security
        status: user.status,
        profileId: user.profileId || ""
      })
    } else {
      // Reset form for new user
      setFormData({
        name: "",
        email: "",
        password: "",
        status: "active",
        profileId: profiles.length > 0 ? profiles[0].id : ""
      })
    }
  }, [user, profiles])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")
    
    // Si aucun profil n'est sélectionné, afficher une alerte
    if (!formData.profileId) {
      setError("Veuillez sélectionner un profil.")
      setIsSubmitting(false)
      return
    }
    
    // If editing a user and password is empty, don't include it in the update
    const dataToSubmit = user && !formData.password
      ? { ...formData, id: user.id, password: undefined }
      : { ...formData, id: user?.id }
    
    console.log('Données soumises:', dataToSubmit)
    
    try {
      await onSave(dataToSubmit)
    } catch (error: any) {
      console.error("Error saving user:", error)
      if (error.response && error.response.data) {
        if (error.response.data.details && Array.isArray(error.response.data.details)) {
          // Afficher chaque erreur sur une nouvelle ligne pour plus de clarté
          setError(error.response.data.details.join("\n"))
        } else if (error.response.data.details) {
          setError(error.response.data.details)
        } else if (error.response.data.error) {
          setError(error.response.data.error)
        } else {
          setError("Erreur lors de l'enregistrement de l'utilisateur")
        }
      } else {
        setError("Erreur lors de l'enregistrement de l'utilisateur")
      }
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle>
          <DialogDescription>
            {user 
              ? "Modifiez les détails de l'utilisateur ci-dessous."
              : "Ajoutez un nouvel utilisateur au système."
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <AlertDescription>
                {error.includes("\n") ? (
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    {error.split("\n").map((err, index) => (
                      <li key={index}>{err}</li>
                    ))}
                  </ul>
                ) : (
                  error
                )}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">
                Mot de passe {user && "(laisser vide pour conserver l'actuel)"}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required={!user}
              />
              {!user && passwordRequirements.length > 0 && (
                <div className="mt-2 text-sm text-gray-500 border rounded-md p-2 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center mb-1">
                    <Info className="h-4 w-4 mr-1 text-blue-500" />
                    <span className="font-medium text-blue-500">Exigences du mot de passe:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="profileId">Profil d'utilisateur</Label>
              <Select
                value={formData.profileId}
                onValueChange={(value) => handleSelectChange("profileId", value)}
                disabled={loadingProfiles}
              >
                <SelectTrigger id="profileId">
                  <SelectValue placeholder={loadingProfiles ? "Chargement..." : "Sélectionner un profil"} />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                  {profiles.length === 0 && !loadingProfiles && (
                    <SelectItem value="no-profile" disabled>
                      Aucun profil disponible
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {profiles.length === 0 && !loadingProfiles && (
                <p className="text-xs text-red-500">
                  Aucun profil actif disponible. Veuillez d'abord créer un profil.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || profiles.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 