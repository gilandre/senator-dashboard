"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { User, USER_STATUSES } from "./columns"
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
  isProcessing?: boolean
}

interface Profile {
  id: string
  name: string
  description: string
}

// Format standardisé des données soumises
interface UserFormData {
  name: string;
  email: string;
  password: string;
  status: string;
  profileId: string; // Pour l'UI
  profileIds?: number[]; // Pour l'API
}

// Interface pour les données d'API
interface UserApiData {
  name: string;
  email: string;
  password?: string;
  status: string;
  profileIds?: number[];
  id?: string | number;
}

// Fonction utilitaire pour le logging
const logInfo = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(`[UserForm] ${message}:`, data);
    } else {
      console.log(`[UserForm] ${message}`);
    }
  }
};

// Fonction utilitaire pour le logging d'erreurs
const logError = (message: string, error?: any) => {
  console.error(`[UserForm] ${message}`, error || '');
};

export function UserForm({ user, isOpen, onClose, onSave, isProcessing = false }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [error, setError] = useState("")
  const [passwordRequirements, setPasswordRequirements] = useState<string[]>([])
  const [loadingRequirements, setLoadingRequirements] = useState(false)
  const [formData, setFormData] = useState<UserFormData>({
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
      setLoadingRequirements(true)
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
        
        if (policy.preventReuse > 0) {
          requirements.push(`Ne peut pas être identique aux ${policy.preventReuse} derniers mots de passe utilisés`)
        }
        
        if (policy.expiryDays > 0) {
          requirements.push(`Expire après ${policy.expiryDays} jours`)
        }
        
        setPasswordRequirements(requirements)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des exigences de mot de passe:", error)
      // Définir les exigences par défaut en cas d'échec
      setPasswordRequirements([
        "Longueur minimale: 8 caractères",
        "Au moins une lettre majuscule (A-Z)",
        "Au moins une lettre minuscule (a-z)",
        "Au moins un chiffre (0-9)",
        "Au moins un caractère spécial (!@#$%^&*)"
      ])
    } finally {
      setLoadingRequirements(false)
    }
  }

  const fetchProfiles = async () => {
    setLoadingProfiles(true)
    try {
      const response = await axios.get('/api/profiles')
      
      // Log détaillé de la structure des profils
      console.log('==== STRUCTURE COMPLÈTE DES PROFILS ====');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Si la réponse contient des profils
      if (response.data) {
        const profilesData = response.data.profiles || (Array.isArray(response.data) ? response.data : []);
        
        // Log des détails du premier profil (comme exemple)
        if (profilesData.length > 0) {
          console.log('==== EXEMPLE DE STRUCTURE D\'UN PROFIL ====');
          console.log(JSON.stringify(profilesData[0], null, 2));
        }
      }
      
      // Continuer avec le code existant
      logInfo('Profils chargés', response.data)
      
      // Standardiser le format des profils
      let activeProfiles: Profile[] = [];
      if (response.data.profiles) {
        // Si la réponse a une propriété profiles (array)
        activeProfiles = response.data.profiles
          .filter((profile: any) => profile.isActive !== false)
          .map((profile: any) => ({
            ...profile,
            id: String(profile.id), // Standardiser en string
            name: profile.name,
            description: profile.description || ""
          }));
      } else if (Array.isArray(response.data)) {
        // Si la réponse est directement un array
        activeProfiles = response.data
          .filter((profile: any) => profile.isActive !== false)
          .map((profile: any) => ({
            ...profile,
            id: String(profile.id), // Standardiser en string
            name: profile.name,
            description: profile.description || ""
          }));
      }
      
      setProfiles(activeProfiles)
      
      // Si aucun profil n'est défini et des profils sont disponibles, utiliser le premier profil par défaut
      if (!formData.profileId && activeProfiles && activeProfiles.length > 0) {
        setFormData(prev => ({ ...prev, profileId: activeProfiles[0].id }))
      }
    } catch (error) {
      logError("Erreur lors du chargement des profils", error)
      setError("Impossible de charger les profils. Veuillez réessayer.")
    } finally {
      setLoadingProfiles(false)
    }
  }

  logInfo('User data for edit', user)
  
  useEffect(() => {
    if (user) {
      logInfo('Setting form data from user', user)
      
      // Normalisation du statut
      const normalizedStatus = user.status && typeof user.status === 'string' 
        ? user.status.toLowerCase() 
        : "active";
        
      // Vérifier que le statut est valide parmi les options disponibles
      const validStatus = normalizedStatus in USER_STATUSES
        ? normalizedStatus
        : "active";
      
      setFormData({
        name: user.name,
        email: user.email,
        password: "", // Don't populate password field for security
        status: validStatus,
        profileId: user.profileId || ""
      })
      
      // Si le nom du profil est disponible, l'afficher dans la console
      if (user.profileName) {
        logInfo('Profile selected', user.profileName)
      }
    } else {
      // Reset form for new user
      logInfo('Resetting form for new user')
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
    
    logInfo('Soumission du formulaire avec les données', formData)
    
    // Validation étendue
    const validationErrors: string[] = [];
    
    if (!formData.name.trim()) {
      validationErrors.push("Le nom est requis");
    }
    
    if (!formData.email.trim()) {
      validationErrors.push("L'email est requis");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      validationErrors.push("Veuillez saisir un email valide");
    }
    
    if (!user && !formData.password) {
      validationErrors.push("Le mot de passe est requis pour un nouvel utilisateur");
    }
    
    if (!formData.profileId) {
      validationErrors.push("Veuillez sélectionner un profil.");
    }
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join("\n"));
      setIsSubmitting(false);
      return;
    }
    
    const selectedProfile = profiles.find(p => p.id === formData.profileId);
    logInfo('Profil sélectionné', selectedProfile?.name);
    
    // Préparation des données à envoyer à l'API dans le format attendu
    const apiData: UserApiData = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
      status: formData.status.toLowerCase(),
      profileIds: formData.profileId ? [parseInt(formData.profileId)] : undefined,
    };
    
    // Ajouter l'ID utilisateur lors de l'édition
    if (user?.id) {
      apiData.id = user.id;
    }
    
    // Si on édite et le mot de passe est vide, le supprimer
    if (user && !formData.password) {
      apiData.password = undefined;
    }
    
    logInfo('Données standardisées à envoyer à l\'API', apiData);
    
    try {
      await onSave(apiData);
    } catch (error: any) {
      logError("Error saving user", error);
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
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleSelectChange("status", value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_STATUSES).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting || isProcessing}
            >
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || isProcessing || profiles.length === 0}
            >
              {(isSubmitting || isProcessing) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {user ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 