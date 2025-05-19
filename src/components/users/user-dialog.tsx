import React, { useState, useEffect } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface User {
  id?: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  status: string;
}

interface UserDialogProps {
  user?: User;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userData: User) => Promise<void>;
  mode: 'create' | 'edit';
}

export default function UserDialog({ user, isOpen, onOpenChange, onSave, mode }: UserDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<User>({
    name: '',
    email: '',
    password: '',
    role: 'operator',
    status: 'active',
  });

  useEffect(() => {
    if (user && mode === 'edit') {
      setUserData({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        // Ne pas inclure le mot de passe en mode édition
        password: '',
      });
    } else {
      // Réinitialiser le formulaire en mode création
      setUserData({
        name: '',
        email: '',
        password: '',
        role: 'operator',
        status: 'active',
      });
    }
  }, [user, mode, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setUserData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    try {
      // Valider les données
      if (!userData.name || !userData.email || (mode === 'create' && !userData.password)) {
        toast({
          title: "Champs requis",
          description: "Veuillez remplir tous les champs obligatoires",
          variant: "destructive",
        });
        return;
      }

      setIsLoading(true);
      
      // Envoyer les données au parent
      await onSave(userData);
      
      // Fermer le dialogue
      onOpenChange(false);
      
      // Message de succès
      toast({
        title: mode === 'create' ? "Utilisateur créé" : "Utilisateur modifié",
        description: mode === 'create' 
          ? "L'utilisateur a été créé avec succès" 
          : "L'utilisateur a été modifié avec succès",
        variant: "default",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Ajouter un utilisateur' : 'Modifier l\'utilisateur'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Remplissez les informations pour créer un nouvel utilisateur.' 
              : 'Modifiez les informations de l\'utilisateur.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              name="name"
              placeholder="Michel Dupont"
              value={userData.name}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m.dupont@example.com"
              value={userData.email}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{mode === 'create' ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide pour ne pas changer)'}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={mode === 'create' ? 'Mot de passe' : '••••••••'}
              value={userData.password}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Profil</Label>
            <Select
              value={userData.role}
              onValueChange={(value) => handleSelectChange('role', value)}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Sélectionner un profil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="manager">Gestionnaire</SelectItem>
                <SelectItem value="operator">Opérateur</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={userData.status}
                onValueChange={(value) => handleSelectChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="inactive">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 