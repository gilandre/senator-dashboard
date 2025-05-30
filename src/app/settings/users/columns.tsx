"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit, KeyRound, User as UserIcon } from "lucide-react"
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
import { StatusCell } from "./status-cell"
import { RoleCell } from "./role-cell"

export type User = {
  id: string
  name: string
  email: string
  role?: string  // Pour rétrocompatibilité
  role_id?: number
  role_name?: string  // Le nom du rôle depuis la relation
  status?: string  // Pour rétrocompatibilité
  status_id?: number
  lastLogin?: Date | string | null
  profileIds?: number[]     // Pour la communication avec l'API (format attendu)
  profiles?: {id: number, name: string}[]  // Pour afficher les profils dans l'interface
  deactivationReason?: string // Raison de la désactivation (ex: 'failed_attempts')
}

// Émission d'événements pour les actions utilisateur
const emitUserEvent = (eventName: string, user: User) => {
  const event = new CustomEvent(eventName, { detail: user })
  document.dispatchEvent(event)
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Nom",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <UserIcon className="h-4 w-4 text-muted-foreground" />
        <span>{row.getValue("name")}</span>
      </div>
    )
  },
  {
    accessorKey: "email",
    header: "Email"
  },
  {
    accessorKey: "role_id",
    header: "Rôle",
    cell: ({ row }) => {
      const user = row.original;
      return <RoleCell roleId={user.role_id} fallbackRoleCode={user.role} />;
    }
  },
  {
    accessorKey: "profiles",
    header: "Profils",
    cell: ({ row }) => {
      const user = row.original
      const profiles = user.profiles || []
      
      if (!profiles.length) return (
        <span className="text-muted-foreground italic text-xs">Aucun profil</span>
      )
      
      // Si plus de 3 profils, afficher un résumé
      if (profiles.length > 3) {
        return (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
              {profiles.slice(0, 2).map((profile: any) => (
                <Badge key={profile.id} variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                  {profile.name}
                </Badge>
              ))}
              <Badge variant="outline" className="bg-gray-100 text-gray-800 text-xs">
                +{profiles.length - 2} autres
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {profiles.map((p: any) => p.name).join(', ')}
            </div>
          </div>
        )
      }
      
      // Afficher tous les profils s'il y en a 3 ou moins
      return (
        <div className="flex flex-wrap gap-1">
          {profiles.map((profile: any) => (
            <Badge key={profile.id} variant="outline" className="bg-purple-100 text-purple-800 text-xs">
              {profile.name}
            </Badge>
          ))}
        </div>
      )
    }
  },
  {
    accessorKey: "status_id",
    header: "Statut",
    cell: ({ row }) => {
      const user = row.original;
      const statusId = user.status_id;
      const statusCode = user.status; // Pour rétrocompatibilité
      const deactivationReason = user.deactivationReason;
      
      return (
        <StatusCell statusId={statusId} fallbackStatusCode={statusCode} deactivationReason={deactivationReason} />
      );
    }
  },
  {
    accessorKey: "lastLogin",
    header: "Dernière connexion",
    cell: ({ row }) => {
      const lastLogin = row.getValue("lastLogin")
      
      if (!lastLogin) {
        return <span className="text-muted-foreground italic">Jamais connecté</span>
      }
      
      try {
        const date = typeof lastLogin === "string" 
          ? new Date(lastLogin) 
          : lastLogin as Date
          
        if (isNaN(date.getTime())) {
          return <span className="text-muted-foreground italic">Jamais connecté</span>
        }
        
        return formatDistanceToNow(date, { 
          addSuffix: true,
          locale: fr
        })
      } catch (error) {
        console.error("Erreur lors du formatage de la date:", error)
        return <span className="text-muted-foreground italic">Date invalide</span>
      }
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
      
      // Récupérer le statut à partir du code de rétrocompatibilité
      const isActive = user.status === "active";
      
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Ouvrir le menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => emitUserEvent('edit-user', user)}>
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => emitUserEvent('reset-password', user)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Réinitialiser mot de passe
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isActive ? (
              <DropdownMenuItem 
                onClick={() => emitUserEvent('deactivate-user', user)}
                className="text-red-600 focus:text-red-600"
              >
                <span className="mr-2 h-4 w-4 flex items-center justify-center">⏸️</span>
                Désactiver
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem 
                onClick={() => emitUserEvent('activate-user', user)}
                className="text-green-600 focus:text-green-600"
              >
                <span className="mr-2 h-4 w-4 flex items-center justify-center">▶️</span>
                Activer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  }
]