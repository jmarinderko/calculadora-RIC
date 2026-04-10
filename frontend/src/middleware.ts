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
  ],
}
