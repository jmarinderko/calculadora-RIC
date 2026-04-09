import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
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

          // Obtener is_admin desde /me
          const meRes = await fetch(`${backendUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${data.access_token}` },
          })
          const me = meRes.ok ? await meRes.json() : {}

          return {
            id: 'user',
            email: credentials.email,
            accessToken: data.access_token,
            isAdmin: me.is_admin ?? false,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
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
