"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { columns, User } from "./columns"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { UserForm } from "./user-form"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { UserActions } from "./user-actions"

// Fonction utilitaire pour le logging
const logInfo = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    if (data) {
      console.log(`[UsersPage] ${message}:`, data);
    } else {
      console.log(`[UsersPage] ${message}`);
    }
  }
};

// Fonction utilitaire pour le logging d'erreurs
const logError = (message: string, error?: any) => {
  console.error(`[UsersPage] ${message}`, error || '');
};

export default function UsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [actionInProgress, setActionInProgress] = useState(false)

  useEffect(() => {
    loadUsers()

    // Event listener for delete action only (edit is handled in UserActions)
    document.addEventListener('delete-user', ((e: CustomEvent) => {
      setUserToDelete(e.detail)
      setIsDeleteDialogOpen(true)
    }) as EventListener)

    return () => {
      document.removeEventListener('delete-user', (() => {}) as EventListener)
    }
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/users')
      
      let usersData: any[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        // Si la réponse est un tableau direct
        usersData = response.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        // Si la réponse est un objet avec une propriété users qui est un tableau
        usersData = response.data.users;
      } else {
        console.error('Format de réponse inattendu', response.data)
        usersData = [];
      }
      
      console.log("Données utilisateurs brutes:", usersData);
      
      // Process each user to ensure profile data is correctly structured
      const processedUsers = usersData.map((user: any) => {
        // Logs détaillés pour le débogage des rôles
        console.log(`Traitement utilisateur ${user.id} (${user.name}):`, {
          role: user.role,
          role_id: user.role_id,
          role_name: user.role_name
        });
        
        return { 
          ...user,
          status: user.status || 'active',
          lastLogin: user.lastLogin || null,
          // Conserver role_id pour la correspondance avec les données de référence
          role_id: user.role_id || null,
          // Préférer role_name si disponible, sinon utiliser role, avec fallback sur 'user'
          role: user.role || 'user',
          role_name: user.role_name || user.role || 'user',
          profileIds: user.profileIds || [],
          profiles: user.profiles || []
        };
      }) as User[];
      
      console.log("Utilisateurs traités:", processedUsers);
      
      setUsers(processedUsers);
      
      logInfo(`${processedUsers.length} utilisateurs chargés`);
    } catch (error) {
      console.error("Erreur lors du chargement des utilisateurs", error)
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des utilisateurs",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveUser = async (userData: any) => {
    setActionInProgress(true);
    try {
      logInfo("Saving user with data", userData);
      
      // S'assurer que les données sont au format attendu par l'API
      // Remarque: userData devrait déjà contenir profileIds au lieu de profileId
      // grâce aux modifications du formulaire
      
      // Vérifier que profileIds est bien défini et au bon format
      if (!userData.profileIds || !Array.isArray(userData.profileIds)) {
        logError("Format incorrect pour profileIds", userData.profileIds);
        showToast("Erreur de format des données. Veuillez réessayer.", "error");
        setActionInProgress(false);
        return;
      }
      
      // Valider que les profileIds sont des nombres
      const validProfileIds = userData.profileIds.every((id: any) => !isNaN(parseInt(id)));
      if (!validProfileIds) {
        logError("profileIds contient des valeurs non numériques", userData.profileIds);
        showToast("Format de profil invalide. Veuillez réessayer.", "error");
        setActionInProgress(false);
        return;
      }
      
      let response;
      if (userToDelete) {
        // Update existing user
        response = await axios.put(`/api/users/${userToDelete.id}`, userData);
        showToast("Utilisateur mis à jour avec succès", "success");
      } else {
        // Create new user
        response = await axios.post('/api/users', userData);
        showToast("Utilisateur créé avec succès", "success");
      }
      
      logInfo("API response", response.data);
      setIsDialogOpen(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error: any) {
      logError("Failed to save user", error);
      
      // Gestion détaillée des erreurs API
      let errorMessage = "Erreur lors de l'enregistrement de l'utilisateur";
      
      if (error.response) {
        // La requête a été faite et le serveur a répondu avec un code d'erreur
        if (error.response.data) {
          if (error.response.data.error) {
            errorMessage = error.response.data.error;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          } else if (error.response.data.details) {
            errorMessage = Array.isArray(error.response.data.details)
              ? error.response.data.details.join(', ')
              : error.response.data.details;
          }
        }
        
        // Erreurs spécifiques basées sur le code HTTP
        if (error.response.status === 409) {
          errorMessage = "Un utilisateur avec cet email existe déjà.";
        } else if (error.response.status === 401) {
          errorMessage = "Vous n'êtes pas autorisé à effectuer cette action.";
        } else if (error.response.status === 403) {
          errorMessage = "Vous n'avez pas les droits suffisants pour effectuer cette action.";
        } else if (error.response.status === 422) {
          errorMessage = "Données invalides. Veuillez vérifier les informations saisies.";
        }
      } else if (error.request) {
        // La requête a été faite mais aucune réponse n'a été reçue
        errorMessage = "Aucune réponse du serveur. Veuillez vérifier votre connexion.";
      }
      
      showToast(errorMessage, "error");
    } finally {
      setActionInProgress(false);
    }
  }

  const handleDeactivateUser = async () => {
    if (!userToDelete) return
    
    setActionInProgress(true);
    try {
      await axios.delete(`/api/users/${userToDelete.id}`)
      showToast("Utilisateur désactivé avec succès", "success")
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (error: any) {
      logError("Failed to deactivate user", error)
      
      // Améliorer le message d'erreur
      let errorMessage = "Erreur lors de la désactivation de l'utilisateur";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = "Vous n'avez pas les droits suffisants pour désactiver cet utilisateur.";
      }
      
      showToast(errorMessage, "error")
    } finally {
      setActionInProgress(false);
    }
  }

  const showToast = (message: string, type: "success" | "error") => {
    toast({
      title: type === "success" ? "Succès" : "Erreur",
      description: message,
      variant: type === "success" ? "default" : "destructive",
    })
  }

  // Gérer la création d'un nouvel utilisateur
  const handleCreateUser = async (userData: any) => {
    setActionInProgress(true);
    try {
      console.log("Création d'un utilisateur avec les données:", userData);
      
      // Vérifier que les données sont correctement structurées avant envoi
      if (userData.profileIds && !Array.isArray(userData.profileIds)) {
        userData.profileIds = userData.profileIds ? [userData.profileIds] : [];
        console.log("Conversion de profileIds en tableau:", userData.profileIds);
      }
      
      const response = await axios.post('/api/users', userData);
      console.log("Réponse de création d'utilisateur:", response.data);
      
      toast({
        title: "Utilisateur créé",
        description: `L'utilisateur ${userData.name} a été créé avec succès.`,
        variant: "default"
      })
      
      setIsDialogOpen(false);
      loadUsers(); // Recharger la liste après la création
    } catch (error: any) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      
      // Extraction d'un message d'erreur plus précis
      let errorMessage = "Une erreur est survenue lors de la création de l'utilisateur.";
      
      if (error.response) {
        if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.status === 409) {
          errorMessage = "Un utilisateur avec cet email existe déjà.";
        } else if (error.response.status === 401) {
          errorMessage = "Vous n'êtes pas autorisé à effectuer cette action.";
        } else if (error.response.status === 400) {
          errorMessage = "Données invalides. Veuillez vérifier les informations saisies.";
        }
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      // Ajouter un petit délai pour éviter un effet de clignotement
      setTimeout(() => {
        setActionInProgress(false);
      }, 500);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gestion des Utilisateurs</CardTitle>
            <CardDescription>
              Gérez les utilisateurs de la plateforme - {users.length} utilisateurs au total
            </CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} disabled={actionInProgress}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel utilisateur
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg text-muted-foreground">
                Chargement des utilisateurs...
              </span>
            </div>
          ) : (
            <DataTable 
              columns={columns} 
              data={users} 
              searchKey="name"
              searchPlaceholder="Rechercher un utilisateur..."
            />
          )}
        </CardContent>
      </Card>

      {/* Modale de création d'utilisateur */}
      {isDialogOpen && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogTitle>Nouvel utilisateur</DialogTitle>
            <DialogDescription>Créez un nouvel utilisateur pour la plateforme.</DialogDescription>
            <UserForm 
              onSubmit={handleCreateUser}
              onCancel={() => setIsDialogOpen(false)}
              isLoading={actionInProgress}
              formType="create"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Composant d'actions utilisateur qui gère les modales d'édition, désactivation, etc. */}
      <UserActions onActionComplete={loadUsers} />

      {/* Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation de désactivation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir désactiver l'utilisateur {userToDelete?.name} ? L'utilisateur ne pourra plus se connecter au système.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={actionInProgress}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateUser}
              disabled={actionInProgress}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Désactivation...
                </>
              ) : (
                "Désactiver"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}