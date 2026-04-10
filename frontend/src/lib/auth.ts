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
        const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
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
          }
        } catch { /* silencioso — token queda sin accessToken */ }
      }
      // Login con credenciales
      if (user) {
        token.accessToken = (user as any).accessToken
        token.email = user.email
        token.isAdmin = (user as any).isAdmin ?? false
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.isAdmin = token.isAdmin as boolean
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
  }
}
declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    isAdmin?: boolean
  }
}
