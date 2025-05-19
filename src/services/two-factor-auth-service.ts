import crypto from 'crypto';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import User from '@/models/User';

interface TwoFactorSetupResult {
  secret: string;
  qrCodeUrl: string;
  recoveryCode: string;
}

export class TwoFactorAuthService {
  /**
   * Générer une configuration pour l'authentification à deux facteurs
   */
  static async setupTwoFactor(userId: string): Promise<TwoFactorSetupResult> {
    try {
      // Récupérer l'utilisateur
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Générer un secret aléatoire
      const secret = crypto.randomBytes(20).toString('hex');
      
      // Créer une instance TOTP (Time-based One-Time Password)
      const totp = new OTPAuth.TOTP({
        issuer: 'SENATOR INVESTECH',
        label: user.email || `user-${userId}`,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromHex(secret)
      });
      
      // Générer l'URL pour le QR code
      const otpAuthUrl = totp.toString();
      
      // Générer le QR code
      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
      
      // Générer un code de récupération
      const recoveryCode = crypto.randomBytes(12).toString('hex').toUpperCase().match(/.{1,4}/g)?.join('-') || '';
      
      // Stocker les informations dans le profil utilisateur
      user.twoFactorAuth = {
        enabled: false, // Sera activé après vérification
        secret: secret,
        recoveryCode: recoveryCode,
        createdAt: new Date()
      };
      
      await user.save();
      
      return {
        secret,
        qrCodeUrl: qrCodeDataUrl,
        recoveryCode
      };
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'authentification à deux facteurs:', error);
      throw error;
    }
  }
  
  /**
   * Activer l'authentification à deux facteurs après vérification du code
   */
  static async verifyAndActivate(userId: string, token: string): Promise<boolean> {
    try {
      // Récupérer l'utilisateur
      const user = await User.findById(userId);
      if (!user || !user.twoFactorAuth || !user.twoFactorAuth.secret) {
        throw new Error('Configuration 2FA non trouvée');
      }
      
      // Vérifier le code
      const isValid = this.verifyToken(user.twoFactorAuth.secret, token);
      
      if (isValid) {
        // Activer l'authentification à deux facteurs
        user.twoFactorAuth.enabled = true;
        user.twoFactorAuth.verifiedAt = new Date();
        await user.save();
      }
      
      return isValid;
    } catch (error) {
      console.error('Erreur lors de la vérification du code 2FA:', error);
      throw error;
    }
  }
  
  /**
   * Vérifier un code d'authentification
   */
  static verifyToken(secret: string, token: string): boolean {
    try {
      // Créer une instance TOTP
      const totp = new OTPAuth.TOTP({
        issuer: 'SENATOR INVESTECH',
        label: 'Authentication',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromHex(secret)
      });
      
      // Vérifier le code
      const delta = totp.validate({ token, window: 1 });
      
      // delta !== null signifie que le code est valide
      return delta !== null;
    } catch (error) {
      console.error('Erreur lors de la vérification du token 2FA:', error);
      return false;
    }
  }
  
  /**
   * Désactiver l'authentification à deux facteurs
   */
  static async disableTwoFactor(userId: string): Promise<boolean> {
    try {
      // Récupérer l'utilisateur
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      // Désactiver l'authentification à deux facteurs
      user.twoFactorAuth = {
        enabled: false,
        secret: null,
        recoveryCode: null,
        createdAt: null,
        verifiedAt: null
      };
      
      await user.save();
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la désactivation du 2FA:', error);
      throw error;
    }
  }

  /**
   * Valider un code de récupération et désactiver le 2FA
   */
  static async validateRecoveryCode(userId: string, recoveryCode: string): Promise<boolean> {
    try {
      // Récupérer l'utilisateur
      const user = await User.findById(userId);
      if (!user || !user.twoFactorAuth || !user.twoFactorAuth.recoveryCode) {
        return false;
      }
      
      // Standardiser le format du code pour la comparaison
      const formattedInput = recoveryCode.toUpperCase().replace(/-/g, '');
      const formattedStored = user.twoFactorAuth.recoveryCode.toUpperCase().replace(/-/g, '');
      
      // Comparer les codes
      if (formattedInput === formattedStored) {
        // Désactiver l'authentification à deux facteurs
        user.twoFactorAuth.enabled = false;
        user.twoFactorAuth.secret = null;
        user.twoFactorAuth.recoveryCode = null;
        await user.save();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erreur lors de la validation du code de récupération:', error);
      return false;
    }
  }
} 