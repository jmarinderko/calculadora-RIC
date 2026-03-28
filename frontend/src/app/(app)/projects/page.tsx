'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/api'
import type { Project } from '@/types'

interface ProjectFormData {
  name: string
  description: string
  location: string
}

const EMPTY_FORM: ProjectFormData = { name: '', description: '', location: '' }

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await getProjects()
      setProjects(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(p: Project) {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', location: p.location ?? '' })
    setError('')
    setShowModal(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editing) {
        await updateProject(editing.id, form)
      } else {
        await createProject(form)
      }
      setShowModal(false)
      await load()
    } catch {
      setError('Error al guardar el proyecto')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proyecto y todos sus cálculos?')) return
    try {
      await deleteProject(id)
      await load()
    } catch {
      alert('Error al eliminar el proyecto')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Proyectos" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider">
            Mis proyectos
          </h2>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2EA043] text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
          >
            <span>+</span> Nuevo proyecto
          </button>
        </div>

        {loading && (
          <div className="text-sm text-[#8B949E] text-center py-12">Cargando…</div>
        )}

        {!loading && projects.length === 0 && (
          <div className="bg-[#161B22] border border-dashed border-[#30363D] rounded-lg p-10 text-center">
            <p className="text-sm text-[#8B949E]">Aún no tienes proyectos.</p>
            <button onClick={openNew} className="mt-2 text-sm text-[#58A6FF] hover:underline">
              Crear primer proyecto →
            </button>
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg divide-y divide-[#21262D]">
            {projects.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-[#21262D] transition-colors">
                <Link href={`/projects/${p.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-[#8B949E] mt-0.5">
                    {[p.location, p.description].filter(Boolean).join(' · ') || 'Sin descripción'}
                  </p>
                </Link>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <span className="text-xs text-[#484F58]">{p.calculation_count ?? 0} cálculo(s)</span>
                  <button
                    onClick={() => openEdit(p)}
                    className="text-xs text-[#8B949E] hover:text-[#58A6FF] px-2 py-1 rounded hover:bg-[#0D1117] transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-xs text-[#8B949E] hover:text-[#F85149] px-2 py-1 rounded hover:bg-[#0D1117] transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal crear / editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold mb-4">
              {editing ? 'Editar proyecto' : 'Nuevo proyecto'}
            </h3>

            {error && (
              <div className="mb-3 px-3 py-2 rounded bg-[#3D1212] border border-[#F85149] text-[#F85149] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8B949E] mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#58A6FF] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B949E] mb-1">Ubicación</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Ej: Santiago, Chile"
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#58A6FF] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#8B949E] mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#58A6FF] transition-colors resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-[#21262D] hover:bg-[#30363D] text-sm py-2 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#238636] hover:bg-[#2EA043] disabled:opacity-50 text-white text-sm font-medium py-2 rounded transition-colors"
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
