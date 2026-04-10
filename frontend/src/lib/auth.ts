import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        try {
          const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
          const res = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: credentials.email, password: credentials.password }),
          })
          if (!res.ok) return null
          const data = await res.json()

          return {
            id: 'user',
            email: credentials.email,
            accessToken: data.access_token,
            isAdmin: data.is_admin ?? false,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Login con Google
      if (account?.provider === 'google' && profile?.email) {
        token.provider = 'google'
        // Intentar con BACKEND_URL (server-side, interno Railway) y si falla
        // reintentar con NEXT_PUBLIC_API_URL (URL pública)
        const urls = [
          process.env.BACKEND_URL,
          process.env.NEXT_PUBLIC_API_URL,
          'http://localhost:8000',
        ].filter(Boolean) as string[]

        for (const backendUrl of urls) {
          try {
            const res = await fetch(`${backendUrl}/api/auth/google`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: profile.email, name: (profile as any).name }),
            })
            if (res.ok) {
              const data = await res.json()
              token.accessToken = data.access_token
              token.isAdmin = data.is_admin ?? false
              break  // éxito — no seguir intentando
            } else {
              console.error(`[auth] Google backend call failed at ${backendUrl}: HTTP ${res.status}`)
            }
          } catch (err) {
            console.error(`[auth] Google backend call error at ${backendUrl}:`, err)
          }
        }

        if (!token.accessToken) {
          console.error('[auth] No se pudo obtener accessToken del backend para Google OAuth')
        }
      }
      // Login con credenciales (no correr para Google — user también viene en OAuth y no tiene accessToken)
      if (user && account?.provider === 'credentials') {
        token.accessToken = (user as any).accessToken
        token.email = user.email
        token.isAdmin = (user as any).isAdmin ?? false
        token.provider = 'credentials'
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.isAdmin = token.isAdmin as boolean
      session.provider = token.provider as string
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt' },
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    isAdmin?: boolean
    provider?: string
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    isAdmin?: boolean
    provider?: string
  }
}
