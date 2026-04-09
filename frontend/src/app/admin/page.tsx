'use client'

import { useEffect, useState } from 'react'
import { getAdminStats, getAdminCharts } from '@/lib/api'
import type { AdminStats, UsageCharts, DailyCount } from '@/types'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: `1px solid ${accent ? 'var(--accent)' : 'var(--border)'}`,
      borderRadius: 'var(--r)',
      padding: '20px 24px',
    }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 32, fontWeight: 600, color: accent ? 'var(--accent)' : 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

// ── Bar chart SVG ─────────────────────────────────────────────────────────────

function BarChart({ data, color = 'var(--accent)', height = 120 }: {
  data: DailyCount[]
  color?: string
  height?: number
}) {
  const max = Math.max(...data.map(d => d.count), 1)
  const barWidth = 100 / data.length

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }} aria-hidden>
      {data.map((d, i) => {
        const barH = (d.count / max) * (height - 16)
        const x = i * barWidth + barWidth * 0.15
        const w = barWidth * 0.7
        const y = height - barH - 8
        return (
          <g key={d.date}>
            <rect
              x={x} y={y} width={w} height={barH || 1}
              fill={color} opacity={0.85} rx="1"
            />
            {d.count > 0 && (
              <text x={x + w / 2} y={y - 2} textAnchor="middle"
                fontSize="4" fill="var(--text3)" fontFamily="monospace">
                {d.count}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Donut chart SVG ───────────────────────────────────────────────────────────

const SISTEMA_COLORS: Record<string, string> = {
  trifasico:  '#F0B429',
  monofasico: '#58A6FF',
  bifasico:   '#3FB950',
  mtat:       '#E09318',
  ernc:       '#A78BFA',
}

function DonutChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)
  const total = entries.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return <div style={{ textAlign: 'center', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, padding: 20 }}>Sin datos</div>

  let cumAngle = -90
  const cx = 50, cy = 50, r = 35, innerR = 20

  function polar(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }

  const slices = entries.map(([label, count]) => {
    const angle = (count / total) * 360
    const start = cumAngle
    cumAngle += angle
    const end = cumAngle
    const [x1, y1] = polar(cx, cy, r, start)
    const [x2, y2] = polar(cx, cy, r, end)
    const [xi1, yi1] = polar(cx, cy, innerR, start)
    const [xi2, yi2] = polar(cx, cy, innerR, end)
    const large = angle > 180 ? 1 : 0
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`
    return { path, color: SISTEMA_COLORS[label] ?? '#6E7681', label, count }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg viewBox="0 0 100 100" style={{ width: 120, height: 120, flexShrink: 0 }}>
        {slices.map(s => (
          <path key={s.label} d={s.path} fill={s.color} opacity={0.9} />
        ))}
        <text x={cx} y={cy + 3} textAnchor="middle" fontSize="8" fontWeight="bold"
          fill="var(--text)" fontFamily="monospace">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="4"
          fill="var(--text3)" fontFamily="monospace">total</text>
      </svg>
      <div style={{ flex: 1 }}>
        {slices.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)', flex: 1, textTransform: 'capitalize' }}>
              {s.label}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text3)' }}>
              {s.count} ({Math.round((s.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── X-axis labels ─────────────────────────────────────────────────────────────

function XAxisLabels({ data }: { data: DailyCount[] }) {
  const step = Math.ceil(data.length / 7)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4 }}>
      {data.filter((_, i) => i % step === 0 || i === data.length - 1).map(d => (
        <span key={d.date} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--text3)' }}>
          {d.date.slice(5)}
        </span>
      ))}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [charts, setCharts] = useState<UsageCharts | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAdminStats(), getAdminCharts()])
      .then(([s, c]) => { setStats(s); setCharts(c) })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 22, color: 'var(--text)', margin: '0 0 4px' }}>
          Dashboard Admin
        </h1>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: 'var(--text3)', margin: 0 }}>
          Estadísticas de uso de la plataforma
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>Cargando...</div>
      ) : (
        <>
          {/* KPI cards */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
              <StatCard label="Usuarios" value={stats.total_users} />
              <StatCard label="Proyectos" value={stats.total_projects} />
              <StatCard label="Cálculos totales" value={stats.total_calculations} />
              <StatCard label="Hoy" value={stats.calculations_today} accent />
              <StatCard label="Esta semana" value={stats.calculations_week} accent />
            </div>
          )}

          {/* Gráficos */}
          {charts && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Cálculos últimos 14 días */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
                <div className="panel-title">Cálculos — últimos 14 días</div>
                <BarChart data={charts.calcs_last_14d} color="var(--accent)" />
                <XAxisLabels data={charts.calcs_last_14d} />
              </div>

              {/* Nuevos usuarios últimos 14 días */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px' }}>
                <div className="panel-title">Nuevos usuarios — últimos 14 días</div>
                <BarChart data={charts.users_last_14d} color="var(--blue)" />
                <XAxisLabels data={charts.users_last_14d} />
              </div>

              {/* Distribución por tipo de sistema */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '18px 20px', gridColumn: '1 / -1' }}>
                <div className="panel-title">Cálculos por tipo de sistema</div>
                <DonutChart data={charts.calcs_by_sistema} />
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
