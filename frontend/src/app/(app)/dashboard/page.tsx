'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { getProjects } from '@/lib/api'
import type { Project } from '@/types'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  color?: string
}

function KpiCard({ label, value, sub, color = '#58A6FF' }: KpiCardProps) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4">
      <p className="text-xs text-[#8B949E] mb-1">{label}</p>
      <p className="font-mono text-2xl font-semibold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-[#484F58] mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProjects()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  const totalCalculations = projects.reduce((acc, p) => acc + (p.calculation_count ?? 0), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Bienvenida */}
        <div>
          <h2 className="text-lg font-semibold">
            Hola, {session?.user?.name ?? session?.user?.email?.split('@')[0]} 👋
          </h2>
          <p className="text-sm text-[#8B949E] mt-0.5">
            Plataforma de cálculo de conductores eléctricos bajo norma RIC chilena
          </p>
        </div>

        {/* KPIs */}
        <section>
          <h3 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">
            Resumen
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Proyectos activos"
              value={loading ? '…' : projects.length}
              sub="Total en cuenta"
              color="#58A6FF"
            />
            <KpiCard
              label="Cálculos totales"
              value={loading ? '…' : totalCalculations}
              sub="Guardados en proyectos"
              color="#3FB950"
            />
            <KpiCard
              label="Norma aplicada"
              value="RIC"
              sub="RIC"
              color="#D29922"
            />
            <KpiCard
              label="Materiales"
              value="Cu / Al"
              sub="THW · THHN · XLPE"
              color="#BC8CFF"
            />
          </div>
        </section>

        {/* Acciones rápidas */}
        <section>
          <h3 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">
            Acciones rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
            <Link
              href="/calculator"
              className="flex items-center gap-3 bg-[#161B22] border border-[#30363D] hover:border-[#58A6FF] rounded-lg p-4 transition-colors group"
            >
              <div className="w-8 h-8 rounded bg-[#0D419D] flex items-center justify-center text-[#58A6FF]">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M12 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM5 3h6v2H5V3zm0 4h2v2H5V7zm0 4h2v2H5v-2zm4-4h2v2H9V7zm0 4h2v2H9v-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-[#58A6FF] transition-colors">Nueva calculación</p>
                <p className="text-xs text-[#8B949E]">Dimensionar conductor RIC</p>
              </div>
            </Link>
            <Link
              href="/projects"
              className="flex items-center gap-3 bg-[#161B22] border border-[#30363D] hover:border-[#3FB950] rounded-lg p-4 transition-colors group"
            >
              <div className="w-8 h-8 rounded bg-[#0A3622] flex items-center justify-center text-[#3FB950]">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M1.75 0A1.75 1.75 0 0 0 0 1.75v12.5C0 15.216.784 16 1.75 16h12.5A1.75 1.75 0 0 0 16 14.25V4.25a.75.75 0 0 0-.22-.53l-3.5-3.5A.75.75 0 0 0 11.75 0H1.75zM1.5 1.75a.25.25 0 0 1 .25-.25H11v2.5c0 .966.784 1.75 1.75 1.75h2.5v8.5a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25V1.75z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-[#3FB950] transition-colors">Gestionar proyectos</p>
                <p className="text-xs text-[#8B949E]">Ver y organizar cálculos</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Proyectos recientes */}
        {!loading && projects.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">
              Proyectos recientes
            </h3>
            <div className="bg-[#161B22] border border-[#30363D] rounded-lg divide-y divide-[#21262D]">
              {projects.slice(0, 5).map(p => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#21262D] transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    {p.location && <p className="text-xs text-[#8B949E]">{p.location}</p>}
                  </div>
                  <span className="text-xs text-[#484F58]">
                    {p.calculation_count ?? 0} cálculo(s)
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && projects.length === 0 && (
          <div className="bg-[#161B22] border border-dashed border-[#30363D] rounded-lg p-8 text-center">
            <p className="text-sm text-[#8B949E]">Aún no tienes proyectos.</p>
            <Link href="/projects" className="mt-2 inline-block text-sm text-[#58A6FF] hover:underline">
              Crear primer proyecto →
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
