import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { SecuritySettingsService } from './lib/security/settingsService';
import { SecurityIncidentService } from './lib/security/incidentService';
import { config as appConfig } from './lib/config';

// Définir les routes qui nécessitent une authentification
const protectedRoutes = [
  '/dashboard',
  '/employees',
  '/visitors',
  '/departments',
  '/access',
  '/access-history',
  '/anomalies',
  '/reports',
  '/import',
  '/export',
  '/settings',
  '/profile',
];

// Définir les routes publiques
const publicRoutes = [
  '/login',
  '/auth/login',
  '/auth',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/images',
  '/static',
];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = url.hostname;
  const requestPath = url.pathname;

  // Vérifier et corriger le port pour les redirections sur localhost
  if (hostname === 'localhost' && url.port !== appConfig.port.toString()) {
    try {
      // S'assurer que l'URL API est valide
      const baseUrl = appConfig.apiUrl || `http://localhost:${appConfig.port}`;
      // Reconstruire l'URL avec le bon port
      const newUrl = new URL(url.pathname + url.search, baseUrl);
      return NextResponse.redirect(newUrl);
    } catch (error) {
      console.error('Erreur lors de la redirection:', error);
      // En cas d'erreur, continuer sans redirection
      return NextResponse.next();
    }
  }

  const token = await getToken({ req: request });
  const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';

  // Vérifier si la requête concerne une API
  const isApiRequest = requestPath.startsWith('/api/');
  
  // Ignorer les requêtes de static assets et d'authentification
  if (
    requestPath.startsWith('/_next') || 
    requestPath.startsWith('/favicon.ico') || 
    requestPath.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Vérifier les restrictions IP pour les API et les pages d'administration
  if (isApiRequest || requestPath.startsWith('/settings/')) {
    try {
      const isIpAllowed = await SecuritySettingsService.isIpAllowed(ipAddress);
      
      if (!isIpAllowed) {
        // Journaliser la tentative d'accès depuis une IP non autorisée
        await SecurityIncidentService.logIncident(
          'unauthorized_access',
          `Accès refusé à ${requestPath} - IP non autorisée`,
          ipAddress,
          'critical',  // Changé de 'blocked' à 'critical' pour correspondre au type
          token?.sub, // userId
          token?.email as string // userEmail
        );
        
        return new NextResponse(JSON.stringify({ 
          error: 'Accès refusé', 
          message: 'Votre adresse IP n\'est pas autorisée à accéder à cette ressource' 
        }), { 
          status: 403,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des restrictions IP:', error);
      // En cas d'erreur, on continue pour ne pas bloquer l'application
    }
  }

  // Rediriger vers /login si l'utilisateur accède à /auth/login
  if (requestPath === '/auth/login') {
    try {
      const loginUrl = new URL('/login', appConfig.apiUrl || `http://localhost:${appConfig.port}`);
      return NextResponse.redirect(loginUrl);
    } catch (error) {
      console.error('Erreur lors de la redirection vers login:', error);
      // Fallback en cas d'erreur
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Rediriger les utilisateurs non authentifiés vers la page de connexion
  // sauf pour les routes publiques et les API publiques
  if (!token) {
    const isPublicRoute = publicRoutes.some(route => 
      requestPath === route || requestPath.startsWith(route)
    );
    
    if (!isPublicRoute && !isApiRequest) {
      try {
        const loginUrl = new URL('/login', appConfig.apiUrl || `http://localhost:${appConfig.port}`);
        return NextResponse.redirect(loginUrl);
      } catch (error) {
        console.error('Erreur lors de la redirection vers login:', error);
        // Fallback en cas d'erreur
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
    
    // Permettre l'accès aux routes publiques même sans authentification
    return NextResponse.next();
  }

  // Si l'utilisateur est authentifié, vérifier s'il doit changer son mot de passe
  if (token && token.sub) {
    // Vérifier si c'est la première connexion et que l'utilisateur doit changer son mot de passe
    const firstLoginJwt = token.firstLogin as boolean | undefined;
    
    if (firstLoginJwt === true) {
      // Vérifier si l'utilisateur essaie d'accéder à une page autre que celle de changement de mot de passe
      if (
        !requestPath.startsWith('/first-password-change') &&
        !requestPath.startsWith('/api/auth') &&
        !requestPath.startsWith('/api/users/change-password')
      ) {
        try {
          const passwordChangeUrl = new URL('/first-password-change', appConfig.apiUrl || `http://localhost:${appConfig.port}`);
          return NextResponse.redirect(passwordChangeUrl);
        } catch (error) {
          console.error('Erreur lors de la redirection vers changement de mot de passe:', error);
          // Fallback en cas d'erreur
          return NextResponse.redirect(new URL('/first-password-change', request.url));
        }
      }
    }
    
    // Vérifier si le mot de passe a expiré
    const passwordExpiredJwt = token.passwordExpired as boolean | undefined;
    
    if (passwordExpiredJwt === true) {
      // Vérifier si l'utilisateur essaie d'accéder à une page autre que celle de changement de mot de passe expiré
      if (
        !requestPath.startsWith('/expired-password-change') &&
        !requestPath.startsWith('/first-password-change') &&
        !requestPath.startsWith('/api/auth') &&
        !requestPath.startsWith('/api/users/change-password')
      ) {
        try {
          const expiredPasswordUrl = new URL('/expired-password-change', appConfig.apiUrl || `http://localhost:${appConfig.port}`);
          return NextResponse.redirect(expiredPasswordUrl);
        } catch (error) {
          console.error('Erreur lors de la redirection vers changement de mot de passe expiré:', error);
          // Fallback en cas d'erreur
          return NextResponse.redirect(new URL('/expired-password-change', request.url));
        }
      }
    }
  }

  // Permettre l'accès pour les utilisateurs authentifiés
  return NextResponse.next();
}

/**
 * Configurer le middleware pour qu'il s'exécute sur toutes les routes pertinentes
 */
export const config = {
  matcher: [
    // Appliquer le middleware à toutes les routes sauf static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 