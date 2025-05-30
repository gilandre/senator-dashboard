"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { useToast } from "@/components/ui/use-toast"
import { User } from "./columns"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, AlertTriangle } from "lucide-react"
import { UserForm } from "./user-form"
import { ResetPasswordForm } from "./reset-password-form"

interface UserActionsProps {
  onActionComplete: () => void
}

export function UserActions({ onActionComplete }: UserActionsProps) {
  const { toast } = useToast()
  const [securitySettings, setSecuritySettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // États pour les différentes modales
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [activateUser, setActivateUser] = useState<User | null>(null)
  
  // État pour la raison de désactivation
  const [deactivationReason, setDeactivationReason] = useState("")

  // Charger les paramètres de sécurité lorsque la modale de réinitialisation de mot de passe est ouverte
  const loadSecuritySettings = async () => {
    try {
      const response = await axios.get('/api/security/settings')
      setSecuritySettings(response.data)
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres de sécurité:", error)
      // Utiliser des paramètres par défaut en cas d'erreur
      setSecuritySettings({
        passwordMinLength: 12,
        passwordRequireUppercase: true,
        passwordRequireNumbers: true,
        passwordRequireSpecial: true
      })
    }
  }

  // Écouteurs d'événements pour les actions utilisateur
  useEffect(() => {
    // Fonction de gestionnaire d'événements pour l'édition d'utilisateur
    const handleEditUser = (event: CustomEvent) => {
      setEditUser(event.detail)
    }

    // Fonction de gestionnaire d'événements pour la désactivation d'utilisateur
    const handleDeactivateUser = (event: CustomEvent) => {
      setDeactivateUser(event.detail)
    }

    // Fonction de gestionnaire d'événements pour la réinitialisation de mot de passe
    const handleResetPassword = (event: CustomEvent) => {
      setResetPasswordUser(event.detail)
      loadSecuritySettings()
    }

    // Fonction de gestionnaire d'événements pour l'activation d'utilisateur
    const handleActivateUser = (event: CustomEvent) => {
      setActivateUser(event.detail)
    }

    // Ajouter les écouteurs d'événements
    document.addEventListener('edit-user', handleEditUser as EventListener)
    document.addEventListener('deactivate-user', handleDeactivateUser as EventListener)
    document.addEventListener('reset-password', handleResetPassword as EventListener)
    document.addEventListener('activate-user', handleActivateUser as EventListener)

    // Nettoyer les écouteurs d'événements
    return () => {
      document.removeEventListener('edit-user', handleEditUser as EventListener)
      document.removeEventListener('deactivate-user', handleDeactivateUser as EventListener)
      document.removeEventListener('reset-password', handleResetPassword as EventListener)
      document.removeEventListener('activate-user', handleActivateUser as EventListener)
    }
  }, [])

  // Gérer l'enregistrement des modifications d'un utilisateur
  const handleUserUpdate = async (userData: any) => {
    setLoading(true)
    try {
      await axios.put(`/api/users/${userData.id}`, userData)
      toast({
        title: "Utilisateur mis à jour",
        description: "Les informations de l'utilisateur ont été mises à jour avec succès.",
      })
      setEditUser(null)
      onActionComplete()
    } catch (error: any) {
      console.error("Erreur lors de la mise à jour de l'utilisateur:", error)
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Une erreur est survenue lors de la mise à jour de l'utilisateur.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Gérer la désactivation d'un utilisateur
  const handleDeactivation = async () => {
    if (!deactivateUser) return
    
    setLoading(true)
    try {
      await axios.put(`/api/users/${deactivateUser.id}/status`, {
        status: "inactive",
        reason: deactivationReason
      })
      toast({
        title: "Utilisateur désactivé",
        description: `L'utilisateur ${deactivateUser.name} a été désactivé avec succès.`,
      })
      setDeactivateUser(null)
      setDeactivationReason("")
      onActionComplete()
    } catch (error: any) {
      console.error("Erreur lors de la désactivation de l'utilisateur:", error)
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Une erreur est survenue lors de la désactivation de l'utilisateur.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Gérer l'activation d'un utilisateur
  const handleActivation = async () => {
    if (!activateUser) return
    
    setLoading(true)
    try {
      await axios.put(`/api/users/${activateUser.id}/status`, {
        status: "active"
      })
      toast({
        title: "Utilisateur activé",
        description: `L'utilisateur ${activateUser.name} a été activé avec succès.`,
      })
      setActivateUser(null)
      onActionComplete()
    } catch (error: any) {
      console.error("Erreur lors de l'activation de l'utilisateur:", error)
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Une erreur est survenue lors de l'activation de l'utilisateur.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Gérer la réinitialisation de mot de passe
  const handlePasswordReset = async (data: any) => {
    if (!resetPasswordUser) return
    
    setLoading(true)
    try {
      await axios.post(`/api/users/${resetPasswordUser.id}/reset-password`, {
        password: data.password,
        requirePasswordChange: data.requirePasswordChange,
        sendEmail: data.sendEmail
      })
      toast({
        title: "Mot de passe réinitialisé",
        description: `Le mot de passe de ${resetPasswordUser.name} a été réinitialisé avec succès.`,
      })
      setResetPasswordUser(null)
      onActionComplete()
    } catch (error: any) {
      console.error("Erreur lors de la réinitialisation du mot de passe:", error)
      toast({
        title: "Erreur",
        description: error.response?.data?.error || "Une erreur est survenue lors de la réinitialisation du mot de passe.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Modale de modification d'utilisateur */}
      {editUser && (
        <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Modifier l'utilisateur</DialogTitle>
              <DialogDescription>
                Modifiez les informations de l'utilisateur ci-dessous.
              </DialogDescription>
            </DialogHeader>
            <UserForm 
              user={editUser}
              onSubmit={handleUserUpdate}
              onCancel={() => setEditUser(null)}
              isLoading={loading}
              formType="edit"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modale de désactivation d'utilisateur */}
      {deactivateUser && (
        <Dialog open={!!deactivateUser} onOpenChange={() => setDeactivateUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Désactiver l'utilisateur</DialogTitle>
              <DialogDescription>
                Voulez-vous vraiment désactiver l'utilisateur {deactivateUser.name} ?
                Cette action peut être annulée ultérieurement.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Raison de la désactivation (optionnelle)</Label>
                <Textarea
                  id="reason"
                  placeholder="Veuillez indiquer la raison de cette désactivation..."
                  value={deactivationReason}
                  onChange={(e) => setDeactivationReason(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeactivateUser(null)} disabled={loading}>
                Annuler
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeactivation} 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Désactiver
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modale d'activation d'utilisateur */}
      {activateUser && (
        <Dialog open={!!activateUser} onOpenChange={() => setActivateUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activer l'utilisateur</DialogTitle>
              <DialogDescription>
                Voulez-vous vraiment activer l'utilisateur {activateUser.name} ?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivateUser(null)} disabled={loading}>
                Annuler
              </Button>
              <Button 
                variant="default" 
                onClick={handleActivation} 
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Activer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modale de réinitialisation de mot de passe */}
      {resetPasswordUser && (
        <Dialog open={!!resetPasswordUser} onOpenChange={() => setResetPasswordUser(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
              <DialogDescription>
                Définissez un nouveau mot de passe pour l'utilisateur {resetPasswordUser.name}.
              </DialogDescription>
            </DialogHeader>
            <ResetPasswordForm 
              user={resetPasswordUser}
              onSubmit={handlePasswordReset}
              onCancel={() => setResetPasswordUser(null)}
              isLoading={loading}
              securitySettings={securitySettings}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
} 