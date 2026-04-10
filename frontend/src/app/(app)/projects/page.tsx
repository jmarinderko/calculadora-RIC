'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/Header'
import { getProjects, createProject, updateProject, deleteProject, getTemplates, applyTemplate } from '@/lib/api'
import type { Project, ProjectTemplate } from '@/types'

interface ProjectFormData {
  name: string
  description: string
  location: string
}

const EMPTY_FORM: ProjectFormData = { name: '', description: '', location: '' }

type ModalMode = 'none' | 'edit' | 'template-select' | 'template-confirm'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modalMode, setModalMode] = useState<ModalMode>('none')
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState<ProjectFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Template state
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate | null>(null)
  const [templateProjectName, setTemplateProjectName] = useState('')
  const [applyingTemplate, setApplyingTemplate] = useState(false)

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

  // ── Modal: Editar / Crear vacío ──────────────────────────────────────────────

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setModalMode('edit')
  }

  function openEdit(p: Project) {
    setEditing(p)
    setForm({ name: p.name, description: p.description ?? '', location: p.location ?? '' })
    setError('')
    setModalMode('edit')
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
      setModalMode('none')
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

  // ── Modal: Plantillas ─────────────────────────────────────────────────────────

  async function openTemplateSelect() {
    setTemplatesLoading(true)
    setSelectedTemplate(null)
    setTemplateProjectName('')
    setError('')
    setModalMode('template-select')
    try {
      const data = await getTemplates()
      setTemplates(data)
    } catch {
      setError('Error al cargar plantillas')
    } finally {
      setTemplatesLoading(false)
    }
  }

  function selectTemplate(tpl: ProjectTemplate) {
    setSelectedTemplate(tpl)
    setTemplateProjectName(tpl.nombre)
    setError('')
    setModalMode('template-confirm')
  }

  async function handleApplyTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTemplate || !templateProjectName.trim()) return
    setError('')
    setApplyingTemplate(true)
    try {
      // Crear el proyecto primero
      const newProject = await createProject({ name: templateProjectName.trim() })
      // Aplicar la plantilla
      await applyTemplate(newProject.id, selectedTemplate.id)
      setModalMode('none')
      await load()
    } catch {
      setError('Error al crear el proyecto con plantilla')
    } finally {
      setApplyingTemplate(false)
    }
  }

  const showModal = modalMode !== 'none'

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Proyectos" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-[#8B949E] uppercase tracking-wider">
            Mis proyectos
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={openTemplateSelect}
              className="flex items-center gap-1.5 bg-[#1C2128] hover:bg-[#21262D] border border-[#30363D] text-[#58A6FF] text-sm font-medium px-3 py-1.5 rounded transition-colors"
            >
              <span>⊞</span> Desde plantilla
            </button>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2EA043] text-white text-sm font-medium px-3 py-1.5 rounded transition-colors"
            >
              <span>+</span> Nuevo proyecto
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-sm text-[#8B949E] text-center py-12">Cargando…</div>
        )}

        {!loading && projects.length === 0 && (
          <div className="bg-[#161B22] border border-dashed border-[#30363D] rounded-lg p-10 text-center">
            <p className="text-sm text-[#8B949E]">Aún no tienes proyectos.</p>
            <div className="flex items-center justify-center gap-3 mt-3">
              <button onClick={openNew} className="text-sm text-[#58A6FF] hover:underline">
                Crear proyecto vacío →
              </button>
              <span className="text-[#30363D]">|</span>
              <button onClick={openTemplateSelect} className="text-sm text-[#58A6FF] hover:underline">
                Usar plantilla →
              </button>
            </div>
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

      {/* Modal crear / editar proyecto vacío */}
      {showModal && modalMode === 'edit' && (
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
                  onClick={() => setModalMode('none')}
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

      {/* Modal selección de plantilla */}
      {showModal && modalMode === 'template-select' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Crear desde plantilla</h3>
              <button
                onClick={() => setModalMode('none')}
                className="text-[#8B949E] hover:text-[#E6EDF3] text-lg leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-[#8B949E] mb-4">
              Selecciona un tipo de instalación para pre-cargar los circuitos típicos en tu nuevo proyecto.
            </p>

            {error && (
              <div className="mb-3 px-3 py-2 rounded bg-[#3D1212] border border-[#F85149] text-[#F85149] text-sm">
                {error}
              </div>
            )}

            {templatesLoading ? (
              <div className="text-sm text-[#8B949E] text-center py-8">Cargando plantillas…</div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => selectTemplate(tpl)}
                    className="text-left p-3 bg-[#0D1117] border border-[#30363D] rounded-lg hover:border-[#58A6FF] hover:bg-[#1C2128] transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-[#E6EDF3] group-hover:text-[#58A6FF] transition-colors">
                          {tpl.nombre}
                        </p>
                        <p className="text-xs text-[#8B949E] mt-0.5">{tpl.descripcion}</p>
                      </div>
                      <span className="ml-3 shrink-0 text-xs text-[#3FB950] bg-[#0D1117] border border-[#238636] px-2 py-0.5 rounded-full">
                        {tpl.num_circuitos} circuitos
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal confirmación + nombre del proyecto */}
      {showModal && modalMode === 'template-confirm' && selectedTemplate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Confirmar plantilla</h3>
              <button
                onClick={() => setModalMode('template-select')}
                className="text-[#8B949E] hover:text-[#E6EDF3] text-sm"
              >
                ← Volver
              </button>
            </div>

            <div className="mb-4 p-3 bg-[#0D1117] border border-[#30363D] rounded-lg">
              <p className="text-sm font-medium text-[#58A6FF]">{selectedTemplate.nombre}</p>
              <p className="text-xs text-[#8B949E] mt-1">{selectedTemplate.descripcion}</p>
              <p className="text-xs text-[#3FB950] mt-2">{selectedTemplate.num_circuitos} circuitos incluidos</p>
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 rounded bg-[#3D1212] border border-[#F85149] text-[#F85149] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleApplyTemplate} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8B949E] mb-1">Nombre del proyecto *</label>
                <input
                  type="text"
                  required
                  value={templateProjectName}
                  onChange={e => setTemplateProjectName(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#58A6FF] transition-colors"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setModalMode('none')}
                  className="flex-1 bg-[#21262D] hover:bg-[#30363D] text-sm py-2 rounded transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={applyingTemplate}
                  className="flex-1 bg-[#238636] hover:bg-[#2EA043] disabled:opacity-50 text-white text-sm font-medium py-2 rounded transition-colors"
                >
                  {applyingTemplate ? 'Creando…' : 'Crear proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
