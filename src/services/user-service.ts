import { prisma } from "@/lib/prisma";
import { hash, compare } from "bcryptjs";
import { SecurityIncidentService } from "@/lib/security/incidentService";

export class UserService {
  /**
   * Récupère un utilisateur par son ID
   */
  static async getUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id: parseInt(id) },
        include: {
          user_profiles: {
            include: {
              profile: true
            }
          }
        }
      });
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      return null;
    }
  }

  /**
   * Récupère un utilisateur par son email
   */
  static async getUserByEmail(email: string) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          user_profiles: {
            include: {
              profile: true
            }
          }
        }
      });
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur:", error);
      return null;
    }
  }

  /**
   * Crée un nouvel utilisateur
   */
  static async createUser(userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    status?: string;
  }) {
    try {
      // Hacher le mot de passe
      const hashedPassword = await hash(userData.password, 10);

      // Créer l'utilisateur
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role || "operator",
          status: userData.status || "active",
          first_login: true,
          last_password_change: new Date()
        }
      });

      return user;
    } catch (error) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      throw error;
    }
  }

  /**
   * Met à jour un utilisateur
   */
  static async updateUser(
    id: string,
    userData: {
      name?: string;
      email?: string;
      role?: string;
      status?: string;
      firstLogin?: boolean;
    }
  ) {
    try {
      // Préparer les données à mettre à jour
      const data: any = {};
      if (userData.name) data.name = userData.name;
      if (userData.email) data.email = userData.email;
      if (userData.role) data.role = userData.role;
      if (userData.status) data.status = userData.status;
      if (userData.firstLogin !== undefined) data.first_login = userData.firstLogin;

      // Mettre à jour l'utilisateur
      return await prisma.user.update({
        where: { id: parseInt(id) },
        data
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'utilisateur:", error);
      throw error;
    }
  }

  /**
   * Change le mot de passe d'un utilisateur
   */
  static async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
    ipAddress: string
  ) {
    try {
      // Récupérer l'utilisateur
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) }
      });

      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      // Vérifier le mot de passe actuel
      const isPasswordValid = await compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new Error("Mot de passe actuel incorrect");
      }

      // Hacher le nouveau mot de passe
      const hashedPassword = await hash(newPassword, 10);

      // Mettre à jour l'utilisateur
      await prisma.user.update({
        where: { id: parseInt(id) },
        data: {
          password: hashedPassword,
          first_login: false,
          last_password_change: new Date()
        }
      });

      // Enregistrer l'incident de sécurité
      await SecurityIncidentService.logPasswordChange(
        id,
        user.email,
        ipAddress
      );

      return { success: true };
    } catch (error: any) {
      console.error("Erreur lors du changement de mot de passe:", error);
      throw error;
    }
  }

  /**
   * Réinitialise le mot de passe d'un utilisateur
   */
  static async resetPassword(
    email: string,
    newPassword: string,
    ipAddress: string
  ) {
    try {
      // Récupérer l'utilisateur
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      // Hacher le nouveau mot de passe
      const hashedPassword = await hash(newPassword, 10);

      // Mettre à jour l'utilisateur
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          first_login: true,
          reset_password_token: null,
          reset_password_expires: null,
          last_password_change: new Date()
        }
      });

      // Enregistrer l'incident de sécurité
      await SecurityIncidentService.logPasswordChange(
        String(user.id),
        user.email,
        ipAddress,
        true
      );

      return { success: true };
    } catch (error) {
      console.error("Erreur lors de la réinitialisation du mot de passe:", error);
      throw error;
    }
  }

  /**
   * Récupère tous les utilisateurs
   */
  static async getAllUsers(
    page: number = 1,
    limit: number = 10,
    search?: string
  ) {
    try {
      const skip = (page - 1) * limit;
      
      // Construire la requête de recherche
      const where: any = {};
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { email: { contains: search } }
        ];
      }
      
      // Récupérer le total d'utilisateurs
      const total = await prisma.user.count({ where });
      
      // Récupérer les utilisateurs
      const users = await prisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip,
        include: {
          user_profiles: {
            include: {
              profile: true
            }
          }
        }
      });
      
      // Transformer les utilisateurs pour le frontend
      const sanitizedUsers = users.map(user => {
        // Extraire les informations sensibles à ne pas renvoyer
        const { password, ...rest } = user;
        
        // Standardiser et transformer les données pour le frontend
        const profileIds = user.user_profiles?.map(up => up.profile.id) || [];
        const profileNames = user.user_profiles?.map(up => up.profile.name) || [];
        
        return {
          ...rest,
          // Ajouter les relations de profil au format attendu
          profileIds,
          profileNames,
          // S'assurer que les champs requis sont toujours présents avec les bons types
          status: user.status || 'active',
          // Utiliser les noms de champs tels qu'ils existent dans la base de données
          lastLogin: null // Ce champ sera ajouté par le frontend avec valeur par défaut
        };
      });
      
      return { users: sanitizedUsers, total };
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      return { users: [], total: 0 };
    }
  }
} 