"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, UserCog, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"

export type User = {
  id: string
  name: string
  email: string
  role: string
  status: string
  lastLogin?: Date | string | null
  profileId?: string        // Pour l'interface utilisateur (sélection d'un profil)
  profileName?: string      // Pour l'affichage du nom de profil
  profileIds?: number[]     // Pour la communication avec l'API (format attendu)
}

// Constants pour les statuts d'utilisateur
export const USER_STATUSES = {
  active: { color: "bg-green-100 text-green-800", label: "Actif" },
  inactive: { color: "bg-gray-100 text-gray-800", label: "Inactif" },
  suspended: { color: "bg-red-100 text-red-800", label: "Suspendu" },
  pending: { color: "bg-yellow-100 text-yellow-800", label: "En attente" },
}

/**
 * Récupère en toute sécurité une valeur dans un objet row
 * @param row L'objet row de la table
 * @param key La clé à récupérer
 * @param defaultValue Valeur par défaut si la clé n'existe pas ou est undefined
 */
function safeGetValue(row: any, key: string, defaultValue: any = ""): any {
  try {
    // Si row et row.original sont définis, essayer d'accéder à la propriété
    if (row && row.original && key in row.original) {
      const value = row.original[key];
      // Vérifier si la valeur est null ou undefined
      if (value === null || value === undefined) {
        return defaultValue;
      }
      return value;
    }
    
    // Si row existe mais pas row.original, essayer d'accéder directement
    if (row && key in row) {
      const value = row[key];
      if (value === null || value === undefined) {
        return defaultValue;
      }
      return value;
    }
    
    // Si on ne peut pas accéder à la propriété, renvoyer la valeur par défaut
    return defaultValue;
  } catch (error) {
    console.warn(`Erreur lors de la récupération de ${key}:`, error);
    return defaultValue;
  }
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Nom",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "profileName",
    header: "Profil",
    cell: ({ row }) => {
      const user = row.original;
      let profileName = safeGetValue(row, "profileName", "") as string;
      
      // Si profileName est vide mais qu'on a profileId, on affiche l'ID au moins
      if ((!profileName || profileName.trim() === "") && user.profileId) {
        profileName = `Profil #${user.profileId}`;
      }
      
      let color = "bg-purple-100 text-purple-800";
      
      if (!profileName || profileName.trim() === "") {
        return (
          <Badge 
            className="font-medium bg-gray-100 text-gray-800"
            variant="outline"
          >
            Non assigné
          </Badge>
        )
      }
      
      return (
        <Badge 
          className={`font-medium ${color}`}
          variant="outline"
          title={user.profileId ? `ID: ${user.profileId}` : undefined}
        >
          {profileName}
        </Badge>
      )
    }
  },
  {
    accessorKey: "status",
    header: "Statut",
    cell: ({ row }) => {
      // Récupérer le status avec gestion robuste
      const user = row.original;
      
      // Récupérer avec valeur par défaut 'active' pour éviter les undefined
      const statusValue = safeGetValue(row, "status", "active");
      
      // Sécuriser contre les valeurs non-string
      let status = "active";
      try {
        if (statusValue !== null && statusValue !== undefined) {
          status = typeof statusValue === 'string' ? statusValue.toLowerCase() : String(statusValue).toLowerCase();
        }
      } catch (error) {
        console.warn("Erreur lors du traitement du statut:", error);
      }
      
      // Valeur par défaut si le statut n'est pas reconnu
      let color = "bg-gray-100 text-gray-800";
      let label = "Inconnu";
      
      // Utiliser les constantes pour un affichage cohérent
      if (status in USER_STATUSES) {
        const statusConfig = USER_STATUSES[status as keyof typeof USER_STATUSES];
        color = statusConfig.color;
        label = statusConfig.label;
      }
      
      return (
        <Badge 
          className={`font-medium ${color}`}
          variant="outline"
        >
          {label}
        </Badge>
      )
    }
  },
  {
    accessorKey: "lastLogin",
    header: "Dernière connexion",
    cell: ({ row }) => {
      const lastLogin = safeGetValue(row, "lastLogin", null);
      
      if (!lastLogin) {
        return <span className="text-gray-400 text-sm">Jamais</span>
      }
      
      try {
        // Support de différents formats de date
        const dateValue = typeof lastLogin === 'string' 
          ? lastLogin 
          : (lastLogin instanceof Date ? lastLogin.toISOString() : String(lastLogin));
        
        // Créer un objet Date à partir de la valeur
        const date = new Date(dateValue);
        
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
          console.warn("Format de date invalide:", lastLogin);
          return <span className="text-gray-400 text-sm">Format invalide</span>
        }
        
        // Afficher "il y a X temps" avec date-fns
        return (
          <span className="text-sm">
            {formatDistanceToNow(date, { addSuffix: true, locale: fr })}
            <span className="block text-xs text-gray-500">
              {date.toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </span>
        )
      } catch (error) {
        console.error("Erreur lors du formatage de la date:", error, "Valeur:", lastLogin)
        return <span className="text-gray-400 text-sm">Erreur de format</span>
      }
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                // Ce code est remplacé par l'événement onEdit défini dans la page
                document.dispatchEvent(new CustomEvent('edit-user', { detail: user }))
              }}
            >
              <UserCog className="mr-2 h-4 w-4" />
              <span>Modifier</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              onClick={(e) => {
                e.stopPropagation()
                // Ce code est remplacé par l'événement onDelete défini dans la page
                document.dispatchEvent(new CustomEvent('delete-user', { detail: user }))
              }}
            >
              <UserMinus className="mr-2 h-4 w-4" />
              <span>Supprimer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 