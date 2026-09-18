import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Runs before every matched request. Its job is to keep the Supabase session
 * cookie fresh and to bounce signed-out visitors to /login.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and the service worker. The worker and
     * manifest in particular must stay reachable without a session or the PWA
     * will not install.
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/|splash/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|webmanifest)$).*)',
  ],
};
