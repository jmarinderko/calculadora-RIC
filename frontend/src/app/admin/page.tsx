'use client'

import { useEffect, useState } from 'react'
import { getAdminStats } from '@/lib/api'
import type { AdminStats } from '@/types'

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r)',
      padding: '20px 24px',
    }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 32, fontWeight: 600, color: 'var(--accent)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats().then(setStats).finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '32px 40px' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 22, color: 'var(--text)', margin: '0 0 6px' }}>
          Dashboard Admin
        </h1>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: 'var(--text3)', margin: 0 }}>
          Estadísticas generales de la plataforma
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>Cargando...</div>
      ) : stats ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
            <StatCard label="Usuarios totales" value={stats.total_users} />
            <StatCard label="Proyectos" value={stats.total_projects} />
            <StatCard label="Cálculos totales" value={stats.total_calculations} />
            <StatCard label="Cálculos hoy" value={stats.calculations_today} />
            <StatCard label="Cálculos esta semana" value={stats.calculations_week} />
          </div>

          <div style={{
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r)',
            padding: '16px 24px',
          }}>
            <div className="panel-title">Accesos rápidos</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { href: '/admin/users',   label: '→ Gestionar usuarios' },
                { href: '/admin/catalog', label: '→ Gestionar catálogo' },
              ].map(({ href, label }) => (
                <a key={href} href={href} style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 13,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  padding: '8px 14px',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--r)',
                }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="warn-box">No se pudieron cargar las estadísticas</div>
      )}
    </div>
  )
}
