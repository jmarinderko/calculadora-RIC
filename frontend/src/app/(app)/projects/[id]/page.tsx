'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { getProjects, getCalculations, shareCalculation, exportXlsx } from '@/lib/api'
import type { Project, Calculation } from '@/types'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [calculations, setCalculations] = useState<Calculation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [projects, calcs] = await Promise.all([
          getProjects(),
          getCalculations(id),
        ])
        const found = projects.find(p => p.id === id)
        if (!found) { router.push('/projects'); return }
        setProject(found)
        setCalculations(calcs)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <Header title="Proyecto" />
        <div className="flex-1 flex items-center justify-center text-sm text-[#8B949E]">Cargando…</div>
      </div>
    )
  }

  if (!project) return null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={project.name} />
      <main className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#8B949E]">
          <Link href="/projects" className="hover:text-[#58A6FF]">Proyectos</Link>
          <span>/</span>
          <span className="text-[#E6EDF3]">{project.name}</span>
        </div>

        {/* Meta */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {project.location && (
            <div>
              <p className="text-xs text-[#8B949E]">Ubicación</p>
              <p>{project.location}</p>
            </div>
          )}
          {project.description && (
            <div className="col-span-2">
              <p className="text-xs text-[#8B949E]">Descripción</p>
              <p>{project.description}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-[#8B949E]">Cálculos guardados</p>
            <p className="font-mono text-lg text-[#58A6FF]">{project.calculation_count ?? calculations.length}</p>
          </div>
        </div>

        {/* Ir a calculadora */}
        <div className="flex justify-end">
          <Link
            href={`/calculator?project=${id}`}
            className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2EA043] text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
          >
            + Nuevo cálculo
          </Link>
        </div>

        {/* Lista de cálculos */}
        {calculations.length === 0 ? (
          <div className="bg-[#161B22] border border-dashed border-[#30363D] rounded-lg p-8 text-center">
            <p className="text-sm text-[#8B949E]">Este proyecto no tiene cálculos guardados.</p>
            <Link
              href={`/calculator?project=${id}`}
              className="mt-2 inline-block text-sm text-[#58A6FF] hover:underline"
            >
              Crear primer cálculo →
            </Link>
          </div>
        ) : (
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg divide-y divide-[#21262D]">
            {actionMsg && (
              <div className="px-4 py-2 text-xs text-[#3FB950] bg-[#3FB95010] border-b border-[#3FB95030]">
                {actionMsg}
              </div>
            )}
            <div className="grid grid-cols-12 px-4 py-2 text-xs text-[#8B949E] font-semibold uppercase tracking-wider">
              <span className="col-span-3">Nombre</span>
              <span className="col-span-2 text-right">Sistema</span>
              <span className="col-span-2 text-right">Tensión</span>
              <span className="col-span-2 text-right">Sección</span>
              <span className="col-span-1 text-right">RIC</span>
              <span className="col-span-2 text-right">Acciones</span>
            </div>
            {calculations.map(c => (
              <div key={c.id} className="grid grid-cols-12 px-4 py-3 text-sm hover:bg-[#21262D] transition-colors items-center">
                <span className="col-span-3 truncate font-medium">{c.name}</span>
                <span className="col-span-2 text-right text-[#8B949E] font-mono text-xs">{c.sistema}</span>
                <span className="col-span-2 text-right font-mono text-xs">{c.tension_v} V</span>
                <span className="col-span-2 text-right font-mono text-xs">{c.seccion_mm2} mm²</span>
                <span className="col-span-1 text-right">
                  {c.cumple_ric ? (
                    <span className="text-xs text-[#3FB950] font-semibold">✓ OK</span>
                  ) : (
                    <span className="text-xs text-[#F85149] font-semibold">✗ No</span>
                  )}
                </span>
                <span className="col-span-2 text-right flex justify-end gap-1">
                  <button
                    title="Compartir"
                    onClick={async () => {
                      try {
                        const { share_url } = await shareCalculation(c.id)
                        const full = window.location.origin + share_url
                        await navigator.clipboard.writeText(full)
                        setActionMsg('Link copiado al portapapeles.')
                        setTimeout(() => setActionMsg(null), 3000)
                      } catch {
                        setActionMsg('Error al generar link.')
                        setTimeout(() => setActionMsg(null), 3000)
                      }
                    }}
                    className="p-1 rounded text-[#8B949E] hover:text-[#58A6FF] hover:bg-[#30363D] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M6.78 1.97a.75.75 0 0 1 0 1.06L3.81 6h6.44A4.75 4.75 0 0 1 15 10.75v.5a.75.75 0 0 1-1.5 0v-.5a3.25 3.25 0 0 0-3.25-3.25H3.81l2.97 2.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L1.47 7.28a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"/>
                    </svg>
                  </button>
                  <button
                    title="Exportar Excel"
                    onClick={async () => {
                      try {
                        await exportXlsx(c.id, `calculo_RIC_${c.name || c.id}.xlsx`)
                      } catch {
                        setActionMsg('Error al exportar Excel.')
                        setTimeout(() => setActionMsg(null), 3000)
                      }
                    }}
                    className="p-1 rounded text-[#8B949E] hover:text-[#3FB950] hover:bg-[#30363D] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2.75 14A1.75 1.75 0 0 1 1 12.25v-2.5a.75.75 0 0 1 1.5 0v2.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25v-2.5a.75.75 0 0 1 1.5 0v2.5A1.75 1.75 0 0 1 13.25 14Z"/>
                      <path d="M7.25 7.689V2a.75.75 0 0 1 1.5 0v5.689l1.97-1.97a.749.749 0 1 1 1.06 1.06l-3.25 3.25a.749.749 0 0 1-1.06 0L4.22 6.779a.749.749 0 1 1 1.06-1.06l1.97 1.97Z"/>
                    </svg>
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
