import { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "./mongodb";
import { compare } from "bcryptjs";
import { JWT } from "next-auth/jwt";
import { SecuritySettingsService } from "@/services/security-settings-service";
import { SecurityIncidentService } from "@/lib/security/incidentService";

// Extend the User type from next-auth
declare module "next-auth" {
  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    firstLogin?: boolean;
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
      authorize: async (credentials, req) => {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        try {
          await connectToDatabase();
          
          const ipAddress = req?.headers?.['x-forwarded-for'] || 'unknown';
          
          const securitySettings = await SecuritySettingsService.getSettings();
          
          const maxLoginAttempts = securitySettings?.accountPolicy?.maxLoginAttempts || 5;
          const lockoutDuration = securitySettings?.accountPolicy?.lockoutDuration || 30;
          
          const User = (await import("../models/User")).default;
          
          const user = await User.findOne({ email: credentials.email });
          
          if (!user) {
            await SecurityIncidentService.logFailedLogin(
              credentials.email,
              ipAddress as string,
              "Utilisateur non trouvé"
            );
            throw new Error("Identifiants incorrects");
          }
          
          if (user.status !== "active") {
            await SecurityIncidentService.logFailedLogin(
              credentials.email,
              ipAddress as string,
              "Compte désactivé"
            );
            throw new Error("Compte désactivé. Contactez l'administrateur.");
          }
          
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            await SecurityIncidentService.logFailedLogin(
              user.email,
              ipAddress as string,
              "Compte verrouillé"
            );
            
            throw new Error("Compte verrouillé");
          }
          
          const isPasswordCorrect = await compare(credentials.password, user.password);
          
          if (!isPasswordCorrect) {
            user.loginAttempts += 1;
            
            if (user.loginAttempts >= maxLoginAttempts) {
              const lockoutMinutes = lockoutDuration;
              const lockUntil = new Date();
              lockUntil.setMinutes(lockUntil.getMinutes() + lockoutMinutes);
              
              user.lockedUntil = lockUntil;
              
              await SecurityIncidentService.logAccountLocked(
                String(user._id),
                user.email,
                ipAddress as string,
                lockoutMinutes
              );
            } else {
              await SecurityIncidentService.logFailedLogin(
                user.email,
                ipAddress as string,
                "Mot de passe incorrect"
              );
            }
            
            await user.save();
            
            throw new Error("Identifiants incorrects");
          }
          
          user.loginAttempts = 0;
          user.lockedUntil = null;
          
          user.lastLogin = new Date();
          await user.save();
          
          await SecurityIncidentService.logIncident(
            'successful_login',
            `Connexion réussie pour ${user.email}`,
            ipAddress as string,
            'info',
            String(user._id),
            user.email
          );
          
          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role || "user",
            firstLogin: user.firstLogin
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
    maxAge: 24 * 60 * 60, // 24 heures
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login", // Error code passed in query string as ?error=
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      console.log("JWT Callback - Token:", token, "User:", user);
      
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.firstLogin = user.firstLogin;
      }
      return token;
    },
    session: async ({ session, token }) => {
      console.log("Session Callback - Session:", session, "Token:", token);
      
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.firstLogin = token.firstLogin as boolean;
      }
      return session as CustomSession;
    },
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
  jwt: {
    maxAge: 24 * 60 * 60,
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