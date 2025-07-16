import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
  const { userId, getToken } = await auth();
  
  const res = NextResponse.next();
  
  if (userId) {
    // Get the actual JWT token
    const token = await getToken();
    
    if (token) {
      res.headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Optional: Also pass userId for convenience
    res.headers.set('X-User-ID', userId);
  }
  
  return res;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}