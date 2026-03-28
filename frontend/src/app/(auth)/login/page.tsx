'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })
    setLoading(false)
    if (res?.error) {
      setError('Correo o contraseña incorrectos')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1117]">
      <div className="w-full max-w-sm">
        {/* Logo / título */}
        <div className="mb-8 text-center">
          <span className="font-mono text-2xl font-semibold text-[#58A6FF]">RIC Conductor</span>
          <p className="mt-1 text-sm text-[#8B949E]">Calculadora NCh Elec 4/2003</p>
        </div>

        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6">
          <h1 className="text-lg font-semibold mb-5">Iniciar sesión</h1>

          {error && (
            <div className="mb-4 px-3 py-2 rounded bg-[#3D1212] border border-[#F85149] text-[#F85149] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#58A6FF] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#238636] hover:bg-[#2EA043] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 rounded text-sm transition-colors"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-[#8B949E]">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-[#58A6FF] hover:underline">
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  )
}
