'use client'

import { useEffect, useState } from 'react'
import { getAdminUsers, updateAdminUser } from '@/lib/api'
import type { AdminUser } from '@/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    getAdminUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  async function toggle(user: AdminUser, field: 'is_active' | 'is_admin') {
    setSaving(user.id)
    try {
      const updated = await updateAdminUser(user.id, { [field]: !user[field] })
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 22, color: 'var(--text)', margin: '0 0 6px' }}>
          Usuarios
        </h1>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: 'var(--text3)', margin: 0 }}>
          {users.length} usuarios registrados
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>Cargando...</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 140px 80px 80px 100px',
            padding: '10px 16px',
            background: 'var(--bg3)',
            borderBottom: '1px solid var(--border)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            <span>Usuario</span>
            <span>Registrado</span>
            <span>Proyectos</span>
            <span>Activo</span>
            <span>Admin</span>
          </div>

          {/* Rows */}
          {users.map(user => (
            <div key={user.id} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 80px 80px 100px',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                  {user.email}
                </div>
                {user.full_name && (
                  <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 11, color: 'var(--text3)' }}>
                    {user.full_name}
                  </div>
                )}
              </div>

              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
                {new Date(user.created_at).toLocaleDateString('es-CL')}
              </div>

              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--text2)', textAlign: 'center' }}>
                {user.project_count}
              </div>

              <div>
                <button
                  onClick={() => toggle(user, 'is_active')}
                  disabled={saving === user.id}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 20,
                    border: 'none',
                    cursor: saving === user.id ? 'not-allowed' : 'pointer',
                    background: user.is_active ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: user.is_active ? 'var(--green)' : 'var(--red)',
                    opacity: saving === user.id ? 0.6 : 1,
                  }}
                >
                  {user.is_active ? 'Activo' : 'Inactivo'}
                </button>
              </div>

              <div>
                <button
                  onClick={() => toggle(user, 'is_admin')}
                  disabled={saving === user.id}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 20,
                    border: '1px solid var(--border)',
                    cursor: saving === user.id ? 'not-allowed' : 'pointer',
                    background: user.is_admin ? 'rgba(240,180,41,0.1)' : 'transparent',
                    color: user.is_admin ? 'var(--accent)' : 'var(--text3)',
                    opacity: saving === user.id ? 0.6 : 1,
                  }}
                >
                  {user.is_admin ? 'Admin ✓' : 'Usuario'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
