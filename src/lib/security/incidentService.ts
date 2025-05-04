// Version Edge-compatible du service d'incidents de sécurité (sans mongoose)
/**
 * Service pour enregistrer et gérer les incidents de sécurité
 * Version compatible avec Edge Runtime
 */
export class SecurityIncidentService {
  /**
   * Enregistre un incident de sécurité (version Edge)
   * Au lieu d'enregistrer en base de données, cette version log les incidents
   * qui peuvent être collectés ultérieurement
   */
  static async logIncident(
    type: string,
    details: string,
    ipAddress: string,
    status: 'resolved' | 'blocked' | 'alert' | 'locked' | 'info' = 'info',
    userId?: string | null,
    userEmail?: string | null
  ): Promise<any> {
    // Dans Edge Runtime, nous ne pouvons pas utiliser mongoose
    // Donc on log simplement l'incident pour que ce soit visible
    console.log(`[SECURITY INCIDENT] ${type}: ${details} | IP: ${ipAddress} | Status: ${status} | User: ${userEmail || 'unknown'}`);
    
    // Si nécessaire, on pourrait appeler une API via fetch pour enregistrer l'incident
    
    // Retourner une structure similaire à celle attendue
    return {
      type,
      details,
      ipAddress,
      status,
      userId,
      userEmail,
      timestamp: new Date()
    };
  }

  /**
   * Enregistre une tentative de connexion échouée
   */
  static async logFailedLogin(
    userEmail: string,
    ipAddress: string,
    reason: string = "Identifiants invalides"
  ): Promise<any> {
    return this.logIncident(
      'failed_login',
      `Échec de connexion pour ${userEmail}: ${reason}`,
      ipAddress,
      'info',
      null,
      userEmail
    );
  }

  /**
   * Enregistre un verrouillage de compte
   */
  static async logAccountLocked(
    userId: string,
    userEmail: string,
    ipAddress: string,
    attempts: number
  ): Promise<any> {
    return this.logIncident(
      'account_locked',
      `Compte verrouillé après ${attempts} tentatives de connexion échouées`,
      ipAddress,
      'locked',
      userId,
      userEmail
    );
  }

  /**
   * Enregistre un changement de mot de passe
   */
  static async logPasswordChange(
    userId: string,
    userEmail: string,
    ipAddress: string,
    isReset: boolean = false
  ): Promise<any> {
    const action = isReset ? "Réinitialisation" : "Changement";
    return this.logIncident(
      isReset ? 'password_reset' : 'password_change',
      `${action} de mot de passe effectué`,
      ipAddress,
      'resolved',
      userId,
      userEmail
    );
  }

  /**
   * Enregistre une tentative d'accès non autorisé
   */
  static async logUnauthorizedAccess(
    ipAddress: string,
    resource: string,
    userId?: string,
    userEmail?: string
  ): Promise<any> {
    return this.logIncident(
      'unauthorized_access',
      `Tentative d'accès non autorisé à ${resource}`,
      ipAddress,
      'blocked',
      userId,
      userEmail
    );
  }

  /**
   * Récupère les incidents récents (simulé)
   */
  static async getRecentIncidents(
    limit: number = 10,
    page: number = 1,
    filter?: { type?: string; userId?: string; ipAddress?: string }
  ): Promise<{ incidents: any[]; total: number }> {
    // Dans Edge Runtime, cette méthode ne fait rien
    // On pourrait appeler une API via fetch si nécessaire
    console.log(`[SECURITY INCIDENT] getRecentIncidents called (Edge-compatible version)`);
    
    // Retourner des données vides
    return { incidents: [], total: 0 };
  }
} 