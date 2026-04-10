'use client'
import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { getProfile, updateProfile } from '@/lib/api'
import type { UserProfile } from '@/types'

export default function ProfilePage() {
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

        {/* Update name */}
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

        {/* Change password */}
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

      </main>
    </div>
  )
}
