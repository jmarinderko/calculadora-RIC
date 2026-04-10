export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/calculator/:path*',
    '/projects/:path*',
    '/profile/:path*',
    '/profile',
    '/admin/:path*',
    '/admin',
    '/voltage-drop-tree/:path*',
    '/voltage-drop-tree',
    '/grounding',
    '/grounding/:path*',
    '/power-factor',
    '/power-factor/:path*',
  ],
}
