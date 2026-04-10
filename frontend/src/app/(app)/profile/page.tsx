'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Header } from '@/components/layout/Header'
import { getProfile, updateProfile } from '@/lib/api'
import type { UserProfile } from '@/types'

export default function ProfilePage() {
  const { data: session } = useSession()
  const isGoogle = (session as any)?.provider === 'google'

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Name form
  const [fullName, setFullName] = useState('')
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savingName, setSavingName] = useState(false)

  // Password form
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    getProfile()
      .then(p => { setProfile(p); setFullName(p.full_name || '') })
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault()
    setSavingName(true)
    setNameMsg(null)
    try {
      const updated = await updateProfile({ full_name: fullName })
      setProfile(updated)
      setNameMsg({ ok: true, text: 'Nombre actualizado correctamente.' })
    } catch (err: any) {
      setNameMsg({ ok: false, text: err?.response?.data?.detail || 'Error al guardar.' })
    } finally {
      setSavingName(false)
    }
  }

  async function handleSavePwd(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd.length < 8) {
      setPwdMsg({ ok: false, text: 'La nueva contraseña debe tener al menos 8 caracteres.' })
      return
    }
    setSavingPwd(true)
    setPwdMsg(null)
    try {
      await updateProfile({ current_password: currentPwd, new_password: newPwd })
      setPwdMsg({ ok: true, text: 'Contraseña actualizada correctamente.' })
      setCurrentPwd('')
      setNewPwd('')
    } catch (err: any) {
      setPwdMsg({ ok: false, text: err?.response?.data?.detail || 'Error al cambiar contraseña.' })
    } finally {
      setSavingPwd(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Perfil" />
        <div className="flex-1 flex items-center justify-center text-sm text-[#8B949E]">Cargando…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Perfil" />
      <main className="flex-1 overflow-y-auto p-6 max-w-lg space-y-6">

        {/* Account info */}
        <section className="bg-[#161B22] border border-[#30363D] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#E6EDF3] mb-3">Cuenta</h2>
          <p className="text-xs text-[#8B949E] mb-1">Email</p>
          <p className="text-sm font-mono text-[#58A6FF]">{profile?.email}</p>
          {profile?.is_admin && (
            <span className="inline-block mt-2 text-xs bg-[#F0B42920] text-[#F0B429] border border-[#F0B42940] rounded px-2 py-0.5">
              Admin
            </span>
          )}
        </section>

        {/* Google notice */}
        {isGoogle && (
          <div className="flex items-start gap-3 bg-[#161B22] border border-[#F0B42940] rounded-lg p-4">
            <svg width="16" height="16" viewBox="0 0 24 24" className="mt-0.5 shrink-0" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <div>
              <p className="text-sm font-medium text-[#E6EDF3]">Cuenta vinculada con Google</p>
              <p className="text-xs text-[#8B949E] mt-0.5">
                El nombre y la contraseña son gestionados por tu cuenta de Google. Para modificarlos, hacelo desde{' '}
                <span className="text-[#58A6FF]">myaccount.google.com</span>.
              </p>
            </div>
          </div>
        )}

        {/* Update name */}
        {!isGoogle && (
        <section className="bg-[#161B22] border border-[#30363D] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#E6EDF3] mb-3">Nombre</h2>
          <form onSubmit={handleSaveName} className="space-y-3">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Tu nombre completo"
              className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm text-[#E6EDF3] placeholder-[#8B949E] focus:outline-none focus:border-[#58A6FF]"
            />
            {nameMsg && (
              <p className={`text-xs ${nameMsg.ok ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
                {nameMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingName}
              className="bg-[#238636] hover:bg-[#2EA043] disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded transition-colors"
            >
              {savingName ? 'Guardando…' : 'Guardar nombre'}
            </button>
          </form>
        </section>
        )}

        {/* Change password */}
        {!isGoogle && (
        <section className="bg-[#161B22] border border-[#30363D] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-[#E6EDF3] mb-3">Cambiar contraseña</h2>
          <form onSubmit={handleSavePwd} className="space-y-3">
            <div>
              <label className="text-xs text-[#8B949E] block mb-1">Contraseña actual</label>
              <input
                type="password"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                required
                className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
              />
            </div>
            <div>
              <label className="text-xs text-[#8B949E] block mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
                minLength={8}
                className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm text-[#E6EDF3] focus:outline-none focus:border-[#58A6FF]"
              />
            </div>
            {pwdMsg && (
              <p className={`text-xs ${pwdMsg.ok ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
                {pwdMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={savingPwd}
              className="bg-[#21262D] hover:bg-[#30363D] disabled:opacity-50 text-[#E6EDF3] text-sm font-medium px-4 py-1.5 rounded border border-[#30363D] transition-colors"
            >
              {savingPwd ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>
        )}

      </main>
    </div>
  )
}
