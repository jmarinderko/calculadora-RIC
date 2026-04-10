import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * GET /api/debug — diagnóstico de sesión y conectividad con el backend.
 * Eliminar en producción cuando no sea necesario.
 */
export async function GET() {
  const session = await getServerSession(authOptions)

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Test de conectividad con el backend
  let backendHealth: { ok: boolean; status?: number; error?: string } = { ok: false }
  try {
    const res = await fetch(`${backendUrl}/api/health`, { signal: AbortSignal.timeout(5000) })
    backendHealth = { ok: res.ok, status: res.status }
  } catch (err: any) {
    backendHealth = { ok: false, error: err?.message ?? String(err) }
  }

  // Test directo del endpoint Google Auth
  let googleAuthTest: { ok: boolean; status?: number; body?: any; error?: string } = { ok: false }
  try {
    const res = await fetch(`${backendUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'debug-test@ricconductor.cl', name: 'Debug Test' }),
      signal: AbortSignal.timeout(5000),
    })
    let body: any
    try { body = await res.json() } catch { body = null }
    googleAuthTest = { ok: res.ok, status: res.status, body }
  } catch (err: any) {
    googleAuthTest = { ok: false, error: err?.message ?? String(err) }
  }

  return NextResponse.json({
    session: {
      exists: !!session,
      hasAccessToken: !!(session as any)?.accessToken,
      provider: (session as any)?.provider ?? null,
      isAdmin: (session as any)?.isAdmin ?? null,
      user: session?.user?.email ?? null,
    },
    env: {
      BACKEND_URL: process.env.BACKEND_URL ? '✓ configurado' : '✗ no configurado',
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ? '✓ configurado' : '✗ no configurado',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✓ configurado' : '✗ no configurado',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✓ configurado' : '✗ no configurado',
      backendUrlUsed: backendUrl,
    },
    backendHealth,
    googleAuthTest,
  })
}
