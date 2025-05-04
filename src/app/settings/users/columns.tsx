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
  lastLogin: string | null
  profileId?: string
  profileName?: string
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
      const profileName = row.getValue("profileName") as string | undefined
      let color = "bg-purple-100 text-purple-800"
      
      if (!profileName) {
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
      const status = row.getValue("status") as string
      const color = status === "active" 
        ? "bg-green-100 text-green-800" 
        : "bg-red-100 text-red-800"
      
      return (
        <Badge 
          className={`font-medium ${color}`}
          variant="outline"
        >
          {status === "active" ? "Actif" : "Inactif"}
        </Badge>
      )
    }
  },
  {
    accessorKey: "lastLogin",
    header: "Dernière connexion",
    cell: ({ row }) => {
      const lastLogin = row.getValue("lastLogin") as string | null
      
      if (!lastLogin) {
        return <span className="text-gray-400 text-sm">Jamais</span>
      }
      
      try {
        // Créer un objet Date à partir de la valeur
        const date = new Date(lastLogin)
        
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
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
        console.error("Erreur lors du formatage de la date:", error)
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