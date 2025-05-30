"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, Check, RefreshCcw, Loader2, Plus, Edit, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RoleForm } from "./role-form"
import axios from "axios"

// Fonction utilitaire pour le logging
const log = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[RolesPage] ${message}`, data || '');
  }
};

export default function RolesPage() {
  const { toast } = useToast()
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncingData, setSyncingData] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<any>(null)

  useEffect(() => {
    loadRoles()
  }, [])

  const loadRoles = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axios.get('/api/roles')
      if (response.data && response.data.roles) {
        setRoles(response.data.roles)
      }
    } catch (error: any) {
      log('Erreur lors du chargement des rôles', error)
      setError(error.message || "Erreur lors du chargement des rôles")
    } finally {
      setLoading(false)
    }
  }

  const syncRolesWithReferenceData = async () => {
    setSyncingData(true)
    try {
      const response = await axios.post('/api/reference-data/sync')
      toast({
        title: "Synchronisation réussie",
        description: response.data.message,
        variant: "default",
      })
      await loadRoles()
    } catch (error: any) {
      log('Erreur lors de la synchronisation', error)
      toast({
        title: "Erreur de synchronisation",
        description: error.response?.data?.error || "Une erreur est survenue lors de la synchronisation",
        variant: "destructive",
      })
    } finally {
      setSyncingData(false)
    }
  }

  const handleAddRole = () => {
    setEditingRole(null)
    setIsDialogOpen(true)
  }

  const handleEditRole = (role: any) => {
    setEditingRole(role)
    setIsDialogOpen(true)
  }

  const handleDeleteRole = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce rôle?")) {
      return
    }

    try {
      await axios.delete(`/api/roles/${id}`)
      toast({
        title: "Rôle supprimé",
        description: "Le rôle a été supprimé avec succès.",
      })
      await loadRoles()
    } catch (error: any) {
      toast({
        title: "Erreur de suppression",
        description: error.response?.data?.error || "Impossible de supprimer ce rôle",
        variant: "destructive",
      })
    }
  }

  const handleFormSuccess = () => {
    setIsDialogOpen(false)
    loadRoles()
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestion des Rôles</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={handleAddRole}
            variant="default"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouveau rôle
          </Button>
          <Button 
            onClick={syncRolesWithReferenceData}
            disabled={syncingData}
            variant="outline"
            className="flex items-center"
          >
            {syncingData ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Synchroniser
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rôles du système</CardTitle>
          <CardDescription>
            Gérez les rôles des utilisateurs dans le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg text-muted-foreground">
                Chargement des rôles...
              </span>
            </div>
          ) : (
            <div className="space-y-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left">ID</th>
                    <th className="py-2 px-4 text-left">Nom</th>
                    <th className="py-2 px-4 text-left">Description</th>
                    <th className="py-2 px-4 text-left">Par défaut</th>
                    <th className="py-2 px-4 text-left">Actif</th>
                    <th className="py-2 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(role => (
                    <tr key={role.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-4">{role.id}</td>
                      <td className="py-2 px-4 font-medium">{role.name}</td>
                      <td className="py-2 px-4">{role.description || '-'}</td>
                      <td className="py-2 px-4">
                        {role.is_default ? (
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-1" />
                            Oui
                          </div>
                        ) : 'Non'}
                      </td>
                      <td className="py-2 px-4">
                        {role.is_active ? (
                          <div className="flex items-center">
                            <Check className="h-4 w-4 text-green-500 mr-1" />
                            Oui
                          </div>
                        ) : 'Non'}
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditRole(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteRole(role.id)}
                            disabled={role.name === 'admin'} // Désactiver pour le rôle admin
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole ? "Modifier le rôle" : "Ajouter un rôle"}
            </DialogTitle>
          </DialogHeader>
          <RoleForm 
            initialData={editingRole}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
} 