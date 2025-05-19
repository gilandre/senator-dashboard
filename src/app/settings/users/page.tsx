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
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [actionInProgress, setActionInProgress] = useState(false)

  useEffect(() => {
    loadUsers()

    // Event listeners for edit and delete actions
    document.addEventListener('edit-user', ((e: CustomEvent) => {
      // Au lieu de directement définir l'utilisateur, récupérer les détails complets
      fetchUserWithProfile(e.detail.id)
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
      
      // Log détaillé de la structure complète
      console.log('==== STRUCTURE COMPLÈTE DE LA RÉPONSE API ====');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Si la réponse contient des utilisateurs avec leurs détails
      if (response.data && (Array.isArray(response.data) || response.data.users)) {
        const usersData = Array.isArray(response.data) ? response.data : response.data.users;
        
        // Log des détails du premier utilisateur (comme exemple)
        if (usersData.length > 0) {
          console.log('==== EXEMPLE DE STRUCTURE D\'UN UTILISATEUR ====');
          console.log(JSON.stringify(usersData[0], null, 2));
          
          // Analyse spécifique des champs problématiques
          console.log('==== ANALYSE DES CHAMPS SPÉCIFIQUES ====');
          const user = usersData[0];
          console.log('Profil:', {
            profileId: user.profileId,
            profileName: user.profileName,
            profile: user.profile,
            profiles: user.profiles
          });
          console.log('Statut:', {
            status: user.status,
            typeOf: typeof user.status
          });
          console.log('Dernière connexion:', {
            lastLogin: user.lastLogin,
            typeOf: typeof user.lastLogin
          });
        }
      }
      
      // Continuer avec le code existant
      logInfo('API response', response.data)
      
      let usersData: any[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        // Si la réponse est un tableau direct
        usersData = response.data;
      } else if (response.data && Array.isArray(response.data.users)) {
        // Si la réponse est un objet avec une propriété users qui est un tableau
        usersData = response.data.users;
      } else {
        // Si la structure est différente ou undefined
        logError('Format de réponse inattendu', response.data)
        usersData = [];
      }
      
      // Process each user to ensure profile data is correctly structured
      const processedUsers = usersData.map((user: any) => {
        // Créer un objet avec des valeurs par défaut pour les champs essentiels
        const processedUser = { 
          ...user,
          // Valeurs par défaut pour éviter les undefined
          status: 'active', // Valeur par défaut pour le statut
          lastLogin: null,  // Valeur par défaut pour dernière connexion
          profileId: "",    // Valeur par défaut pour profileId
          profileName: "",  // Valeur par défaut pour profileName
          profileIds: []    // Valeur par défaut pour profileIds
        };
        
        // 1. Traitement du profil
        // Récupérer les données de profil à partir de différentes structures possibles
        
        try {
          // Si profileIds est fourni, l'utiliser comme source principale
          if (user.profileIds && Array.isArray(user.profileIds) && user.profileIds.length > 0) {
            processedUser.profileId = String(user.profileIds[0]);
            
            // Essayer de récupérer le nom du profil si disponible dans profileNames
            if (user.profileNames && Array.isArray(user.profileNames) && user.profileNames.length > 0) {
              processedUser.profileName = user.profileNames[0];
            }
          }
          // Sinon, chercher dans l'objet profiles
          else if (user.profiles && Array.isArray(user.profiles) && user.profiles.length > 0) {
            // Si l'utilisateur a un tableau de profils (relation many-to-many)
            if (user.profiles[0] && user.profiles[0].id) {
              processedUser.profileId = String(user.profiles[0].id);
              processedUser.profileName = user.profiles[0].name || `Profil #${user.profiles[0].id}`;
              
              // Ajouter profileIds pour la cohérence avec l'API
              processedUser.profileIds = [parseInt(processedUser.profileId)];
            }
          } 
          else if (user.profile && user.profile.id) {
            // Si l'utilisateur a un objet profil unique
            processedUser.profileId = String(user.profile.id);
            processedUser.profileName = user.profile.name || `Profil #${user.profile.id}`;
            
            // Ajouter profileIds pour la cohérence avec l'API
            processedUser.profileIds = [parseInt(processedUser.profileId)];
          }
          else if (user.profile_id && (user.profile_name || user.profileName)) {
            // Format alternatif avec snake_case ou propriétés plates
            processedUser.profileId = String(user.profile_id);
            processedUser.profileName = user.profile_name || user.profileName;
            
            // Ajouter profileIds pour la cohérence avec l'API
            processedUser.profileIds = [parseInt(processedUser.profileId)];
          }
          else if (user.profileId) {
            // Si l'ID du profil est présent mais pas le nom
            processedUser.profileId = String(user.profileId);
            
            // Ajouter profileIds pour la cohérence avec l'API
            processedUser.profileIds = [parseInt(processedUser.profileId)];
          }
        } catch (error) {
          // En cas d'erreur lors du traitement des profils, utiliser les valeurs par défaut
          logError("Erreur lors du traitement des données de profil", error);
        }
        
        // 2. Traitement du statut
        try {
          if (user.status !== undefined && user.status !== null) {
            if (typeof user.status === 'string') {
              // Normaliser le statut en minuscules pour correspondre aux clés USER_STATUSES
              processedUser.status = user.status.toLowerCase();
            } 
            else if (typeof user.status === 'number') {
              // Si le statut est numérique, le mapper à une chaîne
              const statusMap: Record<number, string> = {
                1: 'active',
                2: 'inactive',
                3: 'suspended',
                0: 'inactive' // Valeur par défaut pour 0
              };
              processedUser.status = statusMap[user.status] || 'inactive';
            }
          }
        } catch (error) {
          // En cas d'erreur lors du traitement du statut, utiliser la valeur par défaut
          logError("Erreur lors du traitement du statut", error);
        }
        
        // 3. Traitement de la dernière connexion
        try {
          if (user.lastLogin) {
            // Format existant, déjà traité
            processedUser.lastLogin = user.lastLogin;
          } 
          else if (user.last_login) {
            // Format alternatif (snake_case)
            processedUser.lastLogin = user.last_login;
          }
          else if (user.login_time || user.loginTime) {
            // Autres noms possibles
            processedUser.lastLogin = user.login_time || user.loginTime;
          }
        } catch (error) {
          // En cas d'erreur lors du traitement de la date, utiliser la valeur par défaut
          logError("Erreur lors du traitement de la date de dernière connexion", error);
        }
        
        return processedUser;
      }) as User[];
      
      setUsers(processedUsers);
    } catch (error) {
      logError("Failed to load users", error)
      showToast("Erreur lors du chargement des utilisateurs", "error")
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
      if (selectedUser) {
        // Update existing user
        response = await axios.put(`/api/users/${selectedUser.id}`, userData);
        showToast("Utilisateur mis à jour avec succès", "success");
      } else {
        // Create new user
        response = await axios.post('/api/users', userData);
        showToast("Utilisateur créé avec succès", "success");
      }
      
      logInfo("API response", response.data);
      setIsDialogOpen(false);
      setSelectedUser(null);
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

  // Fonction pour récupérer les informations détaillées d'un utilisateur avec son profil
  const fetchUserWithProfile = async (userId: string) => {
    try {
      const response = await axios.get(`/api/users/${userId}`)
      
      // Log détaillé de la structure d'un utilisateur individuel
      console.log('==== DÉTAILS D\'UN UTILISATEUR INDIVIDUEL ====');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Analyse spécifique des champs problématiques
      if (response.data) {
        console.log('==== ANALYSE DES CHAMPS UTILISATEUR SPÉCIFIQUES ====');
        console.log('Profil:', {
          profileId: response.data.profileId,
          profileName: response.data.profileName,
          profile: response.data.profile,
          profiles: response.data.profiles
        });
        console.log('Statut:', {
          status: response.data.status,
          typeOf: typeof response.data.status
        });
        console.log('Dernière connexion:', {
          lastLogin: response.data.lastLogin,
          typeOf: typeof response.data.lastLogin
        });
      }
      
      // Continuer avec le code existant
      logInfo('Détails utilisateur chargés', response.data)
      
      // Standardisation du format des données utilisateur avec profil
      if (response.data) {
        // Initialiser l'objet utilisateur avec des valeurs par défaut
        const userData = {
          ...response.data,
          // Valeurs par défaut
          status: 'active',
          lastLogin: null,
          profileId: "",
          profileName: "",
          profileIds: []
        };
        
        // Traitement des données de profil
        try {
          // 1. Récupération du profileId à partir de profileIds si disponible
          if (response.data.profileIds && Array.isArray(response.data.profileIds) && response.data.profileIds.length > 0) {
            // Si l'API retourne directement profileIds
            userData.profileId = String(response.data.profileIds[0]);
            
            // Essayer de récupérer le nom du profil si disponible
            if (response.data.profileNames && Array.isArray(response.data.profileNames) && response.data.profileNames.length > 0) {
              userData.profileName = response.data.profileNames[0];
            }
          }
          // 2. Récupération des profils à partir de "profiles"
          else if (response.data.profiles && Array.isArray(response.data.profiles) && response.data.profiles.length > 0) {
            // Si l'utilisateur a un tableau de profils (relation many-to-many)
            if (response.data.profiles[0] && response.data.profiles[0].id) {
              userData.profileId = String(response.data.profiles[0].id);
              userData.profileName = response.data.profiles[0].name || `Profil #${response.data.profiles[0].id}`;
            }
          } 
          // 3. Récupération du profil à partir de "profile" (objet unique)
          else if (response.data.profile && response.data.profile.id) {
            // Si l'utilisateur a un objet profil unique
            userData.profileId = String(response.data.profile.id);
            userData.profileName = response.data.profile.name || `Profil #${response.data.profile.id}`;
          }
          // 4. Autres formats possibles
          else if (response.data.profile_id && (response.data.profile_name || response.data.profileName)) {
            // Format alternatif avec snake_case ou propriétés plates
            userData.profileId = String(response.data.profile_id);
            userData.profileName = response.data.profile_name || response.data.profileName;
          }
          else if (response.data.profileId) {
            // Si l'ID du profil est présent mais pas le nom
            userData.profileId = String(response.data.profileId);
            // Conserver profileName s'il existe
          }
        } catch (error) {
          logError("Erreur lors du traitement des données de profil pour l'édition", error);
        }
        
        // Ajouter profileIds dans le format attendu par l'API (pour la cohérence)
        if (userData.profileId && (!userData.profileIds || userData.profileIds.length === 0)) {
          userData.profileIds = [parseInt(userData.profileId)];
        }
        
        // Traitement du statut
        try {
          if (response.data.status !== undefined && response.data.status !== null) {
            if (typeof response.data.status === 'string') {
              // Normaliser le statut en minuscules
              userData.status = response.data.status.toLowerCase();
            } 
            else if (typeof response.data.status === 'number') {
              // Mapper les valeurs numériques aux chaînes
              const statusMap: Record<number, string> = {
                1: 'active',
                2: 'inactive',
                3: 'suspended',
                0: 'inactive'
              };
              userData.status = statusMap[response.data.status as number] || 'inactive';
            }
          }
        } catch (error) {
          logError("Erreur lors du traitement du statut pour l'édition", error);
        }
        
        // Traitement de la dernière connexion
        try {
          if (response.data.lastLogin) {
            userData.lastLogin = response.data.lastLogin;
          } 
          else if (response.data.last_login) {
            userData.lastLogin = response.data.last_login;
          }
          else if (response.data.login_time || response.data.loginTime) {
            userData.lastLogin = response.data.login_time || response.data.loginTime;
          }
        } catch (error) {
          logError("Erreur lors du traitement de la date pour l'édition", error);
        }
        
        console.log('User standardisé pour l\'édition:', userData);
        setSelectedUser(userData)
      } else {
        setSelectedUser(null);
      }
      
      setIsDialogOpen(true)
    } catch (error) {
      logError("Failed to load user details", error)
      showToast("Erreur lors du chargement des détails de l'utilisateur", "error")
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    setActionInProgress(true);
    try {
      await axios.delete(`/api/users/${userToDelete.id}`)
      showToast("Utilisateur supprimé avec succès", "success")
      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      loadUsers()
    } catch (error: any) {
      logError("Failed to delete user", error)
      
      // Améliorer le message d'erreur
      let errorMessage = "Erreur lors de la suppression de l'utilisateur";
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.status === 403) {
        errorMessage = "Vous n'avez pas les droits suffisants pour supprimer cet utilisateur.";
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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <Button 
          onClick={() => {
            setSelectedUser(null)
            setIsDialogOpen(true)
          }}
          disabled={actionInProgress}
        >
          {actionInProgress ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
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
          isProcessing={actionInProgress}
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
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={actionInProgress}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser} 
              className="bg-red-600 hover:bg-red-700"
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}