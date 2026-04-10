'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { registerApi } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerApi(email, password, fullName)
      // Auto-login tras registro
      const res = await signIn('credentials', { redirect: false, email, password })
      if (res?.error) {
        setError('Registro exitoso, pero no se pudo iniciar sesión automáticamente.')
        router.push('/login')
      } else {
        router.push('/dashboard')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar usuario'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117]">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-mono text-2xl font-semibold text-[#58A6FF]">RIC Conductor</span>
          <p className="mt-1 text-sm text-[#8B949E]">Calculadora NCh Elec 4/2003</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6">
          <h1 className="text-lg font-semibold mb-5">Crear cuenta</h1>

          {error && (
            <div className="mb-4 px-3 py-2 rounded bg-[#3D1212] border border-[#F85149] text-[#F85149] text-sm">
              {error}
            </div>
          )}

          {/* Google */}
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
            className="w-full flex items-center justify-center gap-3 bg-[#0D1117] border border-[#30363D] hover:border-[#484F58] rounded px-3 py-2 text-sm transition-colors mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#30363D]" />
            <span className="text-xs text-[#6E7681]">o con email</span>
            <div className="flex-1 h-px bg-[#30363D]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#8B949E] mb-1">Nombre completo</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#58A6FF] transition-colors"
                placeholder="Ing. Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8B949E] mb-1">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#58A6FF] transition-colors"
                placeholder="usuario@empresa.cl"
              />
            </div>
            <div>
              <label className="block text-sm text-[#8B949E] mb-1">Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#58A6FF] transition-colors"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#238636] hover:bg-[#2EA043] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded text-sm transition-colors"
            >
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-[#8B949E]">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#58A6FF] hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
