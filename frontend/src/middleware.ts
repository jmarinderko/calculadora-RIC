export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/calculator/:path*',
    '/projects/:path*',
    '/billing/:path*',
    '/billing',
  ],
}
