import { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { SecurityIncidentService } from "@/lib/security/incidentService";
import { AuthLogger } from "@/lib/security/authLogger";
import { prisma } from "./prisma";
import { isPasswordExpired } from "./security/passwordValidator";
import config, { JWT_SESSION_DURATION } from "./config";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";

// Extend the User type from next-auth
declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    firstLogin?: boolean;
    passwordExpired?: boolean;
    permissions?: string[];
  }
}

// Define custom session types
export interface CustomSession extends Session {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    firstLogin?: boolean;
    passwordExpired?: boolean;
    permissions?: string[];
  }
}

// Extend NextRequest to include ip
declare module "next/server" {
  interface NextRequest {
    ip?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        try {
          const ipAddress = req?.headers?.['x-forwarded-for'] || 'unknown';
          
          // Journaliser la tentative de connexion
          await AuthLogger.logAuthEvent(
            'login_attempt',
            credentials.email,
            ipAddress as string
          );
          
          // Rechercher l'utilisateur par email avec une requête SQL directe
          const users: any[] = await prisma.$queryRaw`
            SELECT * FROM users WHERE email = ${credentials.email} LIMIT 1
          `;
          
          // Vérifier si l'utilisateur existe
          if (!users || users.length === 0) {
            await AuthLogger.logAuthEvent(
              'login_failure',
              credentials.email,
              ipAddress as string,
              null,
              "Utilisateur non trouvé"
            );
            
            throw new Error("Identifiants incorrects");
          }
          
          const user = users[0];
          
          const isPasswordCorrect = await compare(credentials.password, user.password);
          
          if (!isPasswordCorrect) {
            await AuthLogger.logAuthEvent(
              'login_failure',
              credentials.email,
              ipAddress as string,
              String(user.id),
              "Mot de passe incorrect"
            );
            
            throw new Error("Identifiants incorrects");
          }
          
          // Vérifier si le mot de passe a expiré
          const passwordExpired = user.password_expiry_date ? new Date() > user.password_expiry_date : false;
          
          // Journaliser le succès de connexion avec des détails supplémentaires
          const details = user.first_login 
            ? "Première connexion détectée" 
            : passwordExpired 
              ? "Connexion avec mot de passe expiré"
              : "Connexion réussie";
          
          await AuthLogger.logAuthEvent(
            'login_success',
            user.email,
            ipAddress as string,
            String(user.id),
            details
          );
          
          await SecurityIncidentService.logIncident(
            'successful_login',
            `Connexion réussie pour ${user.email}`,
            ipAddress as string,
            'info',
            String(user.id),
            user.email
          );
          
          return {
            id: String(user.id),
            name: user.name,
            email: user.email,
            role: user.role,
            firstLogin: user.first_login || false,
            passwordExpired: passwordExpired,
            permissions: user.permissions
          };
        } catch (error: any) {
          console.error("Erreur d'authentification:", error.message);
          throw new Error(error.message || "Erreur d'authentification");
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: JWT_SESSION_DURATION, // Utiliser la valeur du fichier de configuration
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login", // Error code passed in query string as ?error=
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      console.log("JWT Callback - Token:", token, "User:", user);
      
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstLogin = user.firstLogin;
        token.passwordExpired = user.passwordExpired;
        token.permissions = user.permissions;
      }
      return token;
    },
    session: async ({ session, token }) => {
      console.log("Session Callback - Session:", session, "Token:", token);
      
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstLogin = token.firstLogin as boolean;
        session.user.passwordExpired = token.passwordExpired as boolean;
        session.user.permissions = token.permissions as string[];
      }
      return session as CustomSession;
    },
  },
  debug: process.env.NODE_ENV === "development" && process.env.DEBUG_AUTH === "true",
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    maxAge: JWT_SESSION_DURATION, // Utiliser la valeur du fichier de configuration
  },
  events: {
    signOut: async ({ token, session }) => {
      try {
        // Journaliser la déconnexion
        if (token && token.email) {
          await AuthLogger.logAuthEvent(
            'logout',
            token.email as string,
            'unknown', // Impossible d'obtenir l'IP ici
            token.id as string,
            "Déconnexion manuelle"
          );
        }
      } catch (error) {
        console.error("Erreur lors de la journalisation de déconnexion:", error);
      }
    },
    session: async ({ token, session }) => {
      try {
        // Journaliser le renouvellement de session (si besoin)
        // Ici on pourrait ajouter une logique pour ne pas surcharger les logs
      } catch (error) {
        console.error("Erreur lors de la journalisation de session:", error);
      }
    }
  }
};

// Helper function to check if a user is an admin
export const isAdmin = (session: CustomSession | null) => {
  return session?.user?.role === "admin";
};

// Helper function to get current user ID
export const getCurrentUserId = (session: CustomSession | null) => {
  return session?.user?.id || null;
};

// Helper function to get current user name
export const getCurrentUserName = (session: CustomSession | null) => {
  return session?.user?.name || null;
};

// Add authorization middleware
const authorize = (requiredPermissions: string[]) => {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.permissions?.some(p => requiredPermissions.includes(p))) {
      throw new Error('Unauthorized');
    }
    return req;
  };
};

// Add rate limiting
const rateLimit = (windowMs: number, max: number) => {
  const store = new Map<string, {count: number, resetTime: number}>();
  return async (req: NextRequest) => {
    const ip = req.ip || req.headers.get('x-forwarded-for');
    const current = store.get(ip) || {count: 0, resetTime: Date.now() + windowMs};
    
    if (Date.now() > current.resetTime) {
      store.delete(ip);
      return req;
    }
    
    if (current.count >= max) {
      throw new Error('Too many requests');
    }
    
    store.set(ip, {...current, count: current.count + 1});
    return req;
  };
};

// Add deactivation reason handling
export const handleFailedLogin = async (userId: string) => {
  // Au lieu de compter les tentatives échouées, on suspend directement l'utilisateur
  await prisma.users.update({
    where: { id: Number(userId) },
    data: {
      status: 'suspended',
    }
  });
};