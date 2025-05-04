// Version Edge-compatible du service de paramètres de sécurité
/**
 * Service pour gérer les paramètres de sécurité
 * Version compatible avec Edge Runtime
 */
export class SecuritySettingsService {
  /**
   * Vérifie si une adresse IP est autorisée
   * En Edge Runtime, autorise toutes les IPs (la vraie vérification se fera côté serveur)
   */
  static async isIpAllowed(ipAddress: string): Promise<boolean> {
    // Dans Edge Runtime, nous autorisons toutes les IPs
    // La vérification réelle devrait être effectuée dans une API
    console.log(`[SECURITY] Vérification d'IP (version Edge): ${ipAddress}`);
    return true;
  }
  
  /**
   * Vérifie si un utilisateur doit changer son mot de passe lors de la première connexion
   * En Edge Runtime, cette fonction retourne une valeur par défaut
   */
  static async shouldForcePasswordChange(): Promise<boolean> {
    // Dans Edge Runtime, cette fonction retourne une valeur par défaut
    // La vérification réelle devrait être effectuée dans une API
    return true;
  }
} 