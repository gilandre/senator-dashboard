"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { columns, User } from "./columns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { UserForm } from "./user-form"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  useEffect(() => {
    loadUsers()

    // Event listeners for edit and delete actions
    document.addEventListener('edit-user', ((e: CustomEvent) => {
      setSelectedUser(e.detail)
      setIsDialogOpen(true)
    }) as EventListener)

    document.addEventListener('delete-user', ((e: CustomEvent) => {
      setUserToDelete(e.detail)
      setIsDeleteDialogOpen(true)
    }) as EventListener)

    return () => {
      document.removeEventListener('edit-user', (() => {}) as EventListener)
      document.removeEventListener('delete-user', (() => {}) as EventListener)
    }
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/users')
      console.log('API response:', response.data)
      
      if (response.data && Array.isArray(response.data)) {
        // Si la réponse est un tableau direct
        setUsers(response.data)
      } else if (response.data && Array.isArray(response.data.users)) {
        // Si la réponse est un objet avec une propriété users qui est un tableau
        setUsers(response.data.users)
      } else {
        // Si la structure est différente ou undefined
        console.error('Format de réponse inattendu:', response.data)
        setUsers([])
      }
    } catch (error) {
      console.error("Failed to load users:", error)
      showToast("Erreur lors du chargement des utilisateurs", "error")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUser = async (userData: any) => {
    try {
      if (selectedUser) {
        // Update existing user
        await axios.put(`/api/users/${selectedUser.id}`, userData)
        showToast("Utilisateur mis à jour avec succès", "success")
      } else {
        // Create new user
        await axios.post('/api/users', userData)
        showToast("Utilisateur créé avec succès", "success")
      }
      setIsDialogOpen(false)
      setSelectedUser(null)
      loadUsers()
    } catch (error) {
      console.error("Failed to save user:", error)
      showToast("Erreur lors de l'enregistrement de l'utilisateur", "error")
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    try {
      await axios.delete(`/api/users/${userToDelete.id}`)
      showToast("Utilisateur supprimé avec succès", "success")
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (error) {
      console.error("Failed to delete user:", error)
      showToast("Erreur lors de la suppression de l'utilisateur", "error")
    }
  }

  const showToast = (message: string, type: "success" | "error") => {
    toast({
      title: type === "success" ? "Succès" : "Erreur",
      description: message,
      variant: type === "success" ? "default" : "destructive",
    })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <Button 
          onClick={() => {
            setSelectedUser(null)
            setIsDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs</CardTitle>
          <CardDescription>Liste de tous les utilisateurs du système</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={users} 
            loading={loading} 
          />
        </CardContent>
      </Card>

      {/* User Form Dialog */}
      {isDialogOpen && (
        <UserForm
          user={selectedUser}
          isOpen={isDialogOpen}
          onClose={() => {
            setIsDialogOpen(false)
            setSelectedUser(null)
          }}
          onSave={handleSaveUser}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur {userToDelete?.name} ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}