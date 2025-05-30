"use client"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card"
import { Loader2, AlertTriangle, Info, X, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { MultiSelect } from "@/components/ui/multi-select"
import { Badge } from "@/components/ui/badge"
import { useReferenceData, ReferenceDataItem } from "@/components/reference-data-provider"

// Schéma de validation pour le formulaire utilisateur
const userFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  role_id: z.number().optional(),
  status_id: z.number().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(), // Gardé pour rétrocompatibilité
  profileIds: z.array(z.number()).optional(),
})

type UserFormData = z.infer<typeof userFormSchema>

// Type pour les options des profils
type ProfileOption = {
  value: number;
  label: string;
}

interface UserFormProps {
  user?: any; // Utilisateur existant pour l'édition
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  formType?: "create" | "edit"; // Type de formulaire
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

// Définir un composant SimplifiedMultiSelect personnalisé pour le formulaire utilisateur
interface SimplifiedMultiSelectProps {
  options: { value: number; label: string }[];
  value: number[];
  onChange: (values: number[]) => void;
  isLoading?: boolean;
  placeholder?: string;
}

function SimplifiedMultiSelect({ 
  options, 
  value, 
  onChange, 
  isLoading = false,
  placeholder = "Sélectionner..."
}: SimplifiedMultiSelectProps) {
  // Transformer les valeurs en objets pour l'affichage
  const selectedOptions = options.filter(option => value.includes(option.value));
  
  const handleToggleOption = (optionValue: number) => {
    if (value.includes(optionValue)) {
      // Si déjà sélectionné, le retirer
      onChange(value.filter(v => v !== optionValue));
    } else {
      // Sinon l'ajouter
      onChange([...value, optionValue]);
    }
  };
  
  return (
    <div className="space-y-2 w-full">
      {/* Afficher les options sélectionnées */}
      <div className="flex flex-wrap gap-1">
        {selectedOptions.length > 0 ? (
          selectedOptions.map(option => (
            <Badge key={option.value} variant="secondary" className="px-2 py-1">
              {option.label}
              <button
                type="button"
                className="ml-1"
                onClick={() => handleToggleOption(option.value)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Supprimer {option.label}</span>
              </button>
            </Badge>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">{placeholder}</div>
        )}
      </div>
      
      {/* Liste des options */}
      <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            <span>Chargement...</span>
          </div>
        ) : options.length === 0 ? (
          <div className="text-sm text-center py-2 text-muted-foreground">
            Aucune option disponible
          </div>
        ) : (
          <div className="space-y-1">
            {options.map(option => (
              <div 
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-secondary/50 cursor-pointer"
                onClick={() => handleToggleOption(option.value)}
              >
                <div className={`w-4 h-4 rounded-sm flex items-center justify-center ${value.includes(option.value) ? 'bg-primary text-primary-foreground' : 'border border-primary'}`}>
                  {value.includes(option.value) && <Check className="h-3 w-3" />}
                </div>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function UserForm({ user, onSubmit, onCancel, isLoading = false, formType = "create" }: UserFormProps) {
  const { toast } = useToast()
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [roles, setRoles] = useState<{value: number, label: string}[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const { getItems } = useReferenceData(); // Utiliser le hook de données de référence
  
  // Récupérer les statuts depuis les données de référence
  const statuses = getItems('status', 'users');
  
  // Configurer le formulaire avec les valeurs par défaut
  const defaultValues: Partial<UserFormData> = {
    id: user?.id || "",
    name: user?.name || "",
    email: user?.email || "",
    role_id: user?.role_id || undefined,
    status_id: user?.status_id || undefined,
    status: user?.status || "active",
    profileIds: user?.profileIds || [],
  }

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues,
  })

  // Charger les profils et les rôles au chargement du composant
  useEffect(() => {
    loadProfiles()
    loadRoles()
    
    // Si un utilisateur est fourni, réinitialiser le formulaire avec ses valeurs
    if (user) {
      reset({
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id || undefined,
        status_id: user.status_id || undefined,
        status: user.status || "active",
        profileIds: Array.isArray(user.profileIds) ? user.profileIds : 
                   (user.profiles && Array.isArray(user.profiles)) 
                   ? user.profiles.map((p: any) => p.id) 
                   : [],
      })
    }
  }, [user, reset])

  // Charger la liste des profils depuis l'API
  const loadProfiles = async () => {
    setLoadingProfiles(true)
    try {
      console.log("Chargement des profils en cours...");
      const response = await axios.get('/api/profiles')
      console.log("Réponse de l'API profiles:", response.data);
      
      // Formater les profils pour le multiselect
      if (response.data && response.data.profiles) {
        const profileOptions = response.data.profiles.map((profile: any) => ({
          value: profile.id,
          label: profile.name,
        }))
        console.log("Options de profils formatées:", profileOptions);
        setProfiles(profileOptions)
      } else if (response.data && Array.isArray(response.data)) {
        // Gestion alternative si les profils sont directement dans un tableau
        const profileOptions = response.data.map((profile: any) => ({
          value: profile.id,
          label: profile.name,
        }))
        console.log("Options de profils formatées (format alternatif):", profileOptions);
        setProfiles(profileOptions)
      } else {
        console.error("Format de réponse inattendu:", response.data)
        // Créer un ensemble de profils par défaut pour le développement local
        if (process.env.NODE_ENV === 'development') {
          console.log("Utilisation de profils de développement par défaut");
          const defaultProfiles = [
            { value: 1, label: "Administrateur" },
            { value: 2, label: "Opérateur" },
            { value: 3, label: "Utilisateur standard" }
          ];
          setProfiles(defaultProfiles);
        } else {
          toast({
            title: "Avertissement",
            description: "Format de réponse inattendu lors du chargement des profils",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des profils:", error)
      if (axios.isAxiosError(error)) {
        console.error("Détails de l'erreur Axios:", error.response?.data);
        console.error("Status:", error.response?.status);
        console.error("Headers:", error.response?.headers);
      }
      
      // Créer un ensemble de profils par défaut pour le développement local
      if (process.env.NODE_ENV === 'development') {
        console.log("Utilisation de profils de développement par défaut après erreur");
        const defaultProfiles = [
          { value: 1, label: "Administrateur" },
          { value: 2, label: "Opérateur" },
          { value: 3, label: "Utilisateur standard" }
        ];
        setProfiles(defaultProfiles);
        
        // Ne pas montrer de toast en développement pour les erreurs de profil
        // cela permettra aux utilisateurs de tester l'interface sans interruption
      } else {
        toast({
          title: "Erreur",
          description: "Impossible de charger la liste des profils. Veuillez rafraîchir la page.",
          variant: "destructive",
        })
      }
    } finally {
      // Garantir que loadingProfiles est toujours mis à false
      setLoadingProfiles(false)
    }
  }

  // Ajouter un effet pour s'assurer que le chargement n'est pas bloqué
  useEffect(() => {
    // Garantir que loadingProfiles ne reste pas bloqué à true
    const timeoutId = setTimeout(() => {
      if (loadingProfiles) {
        console.log("Protection contre le blocage de loadingProfiles");
        setLoadingProfiles(false);
        
        // Si nous sommes toujours en chargement après 5 secondes et qu'aucun profil n'est chargé,
        // utiliser des profils par défaut en développement
        if (profiles.length === 0 && process.env.NODE_ENV === 'development') {
          console.log("Utilisation de profils de secours après timeout");
          setProfiles([
            { value: 1, label: "Administrateur" },
            { value: 2, label: "Opérateur" },
            { value: 3, label: "Utilisateur standard" }
          ]);
        }
      }
    }, 5000); // Timeout de 5 secondes
    
    return () => clearTimeout(timeoutId);
  }, [loadingProfiles, profiles.length]);

  // Charger la liste des rôles depuis l'API
  const loadRoles = async () => {
    setLoadingRoles(true)
    try {
      const response = await axios.get('/api/roles')
      
      // Formater les rôles pour le select
      if (response.data && response.data.roles) {
        const roleOptions = response.data.roles.map((role: any) => ({
          value: role.id,
          label: role.name.charAt(0).toUpperCase() + role.name.slice(1), // Première lettre en majuscule
        }))
        setRoles(roleOptions)
      } else {
        console.error("Format de réponse inattendu:", response.data)
      }
    } catch (error) {
      console.error("Erreur lors du chargement des rôles:", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des rôles",
        variant: "destructive",
      })
    } finally {
      setLoadingRoles(false)
    }
  }

  // Gérer la soumission du formulaire
  const handleFormSubmit = async (data: UserFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error("Erreur lors de la soumission du formulaire:", error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{formType === "create" ? "Nouvel utilisateur" : "Modifier l'utilisateur"}</CardTitle>
          <CardDescription>
            {formType === "create" 
              ? "Créer un nouvel utilisateur dans le système" 
              : "Modifier les informations de l'utilisateur"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input 
              id="name" 
              {...register("name")}
              disabled={isLoading}
              placeholder="Nom complet"
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email"
              {...register("email")}
              disabled={isLoading || (formType === "edit")} // Désactiver l'email en mode édition
              placeholder="utilisateur@exemple.com"
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role_id">Rôle</Label>
            <Controller
              name="role_id"
              control={control}
              render={({ field }) => (
                <Select 
                  disabled={isLoading || loadingRoles}
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  value={field.value?.toString()}
                >
                  <SelectTrigger id="role_id" className={errors.role_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.value} value={role.value.toString()}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role_id && (
              <p className="text-sm text-red-500">{errors.role_id.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status_id">Statut</Label>
            <Controller
              name="status_id"
              control={control}
              render={({ field }) => (
                <Select 
                  disabled={isLoading}
                  onValueChange={(value) => field.onChange(parseInt(value))} 
                  value={field.value?.toString()}
                >
                  <SelectTrigger id="status_id" className={errors.status_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id.toString()}>
                        {status.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status_id && (
              <p className="text-sm text-red-500">{errors.status_id.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="profileIds">Profils</Label>
            <Controller
              name="profileIds"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <div id="profileIds">
                    <SimplifiedMultiSelect
                      isLoading={loadingProfiles}
                      options={profiles}
                      value={field.value || []}
                      onChange={(selectedValues) => {
                        console.log("Profils sélectionnés:", selectedValues);
                        field.onChange(selectedValues);
                      }}
                      placeholder={loadingProfiles ? "Chargement des profils..." : "Sélectionner des profils"}
                    />
                  </div>
                  
                  {profiles.length === 0 && !loadingProfiles && (
                    <div className="text-xs text-amber-600 flex items-center mt-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Aucun profil disponible. Veuillez créer des profils dans la section de gestion des profils.
                    </div>
                  )}
                  
                  {field.value && field.value.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium">{field.value.length}</span> profil(s) sélectionné(s)
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Les profils déterminent les permissions de l'utilisateur dans le système
                  </div>
                </div>
              )}
            />
          </div>
          
          {formType === "create" && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground">
                Note: Un mot de passe temporaire sera généré et envoyé à l'utilisateur.
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
            {formType === "create" ? "Créer" : "Enregistrer"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
} 