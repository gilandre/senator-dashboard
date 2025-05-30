import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;

  // Define public paths that don't require authentication
  const isPublicPath = 
    path === '/login' || 
    path === '/register' || 
    path === '/forgot-password' ||
    path === '/reset-password';

  // Get the token from the cookies
  const token = request.cookies.get('next-auth.session-token')?.value || 
                request.cookies.get('__Secure-next-auth.session-token')?.value;
  
  // If the path is public and the user is logged in, redirect to dashboard
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If the path is not public and the user is not logged in, redirect to login
  if (!isPublicPath && !token) {
    // Create the URL to redirect to login, with a return URL
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Specify which paths this middleware should be applied to
export const config = {
  matcher: [
    // Routes that require authentication
    '/dashboard/:path*',
    '/employees/:path*',
    '/visitors/:path*',
    '/reports/:path*',
    '/attendance/:path*',
    '/anomalies/:path*',
    '/settings/:path*',
    '/import/:path*',
    // Public routes
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
  ],
}; 

// Performance monitoring middleware
const trackPerformance = async (req: NextRequest, event: NextFetchEvent) => {
  const start = Date.now();
  let success = true;

  try {
    const response = await NextResponse.next();
    
    // Log database queries if using Prisma
    if (global.prisma) {
      prisma.$on('query', (e) => {
        console.log(`DB Query: ${e.query} | Duration: ${e.duration}ms`);
      });
    }

    return response;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = Date.now() - start;
    console.log({
      path: req.nextUrl.pathname,
      method: req.method,
      duration: `${duration}ms`,
      success
    });

    // Send metrics to external monitoring service if needed
    // await sendMetrics({ path, method, duration, success });
  }
};