'use client'

import { useEffect, useState } from 'react'
import { getAdminCatalog, createConductor, updateConductor, deleteConductor } from '@/lib/api'
import type { Conductor } from '@/types'

const EMPTY: Partial<Conductor> = {
  proveedor: '', tipo: '', calibre_awg: '', seccion_mm2: undefined,
  material: 'cu', resistencia_dc_20: undefined, i_max_ducto: undefined,
  i_max_aire: undefined, tension_nom_v: 1000, temp_max_c: 75,
  norma_ref: 'NCh Elec 4/2003', certificacion_sec: false, activo: true,
}

function Input({ label, value, onChange, type = 'text' }: {
  label: string; value: string | number | undefined; onChange: (v: string) => void; type?: string
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="form-input"
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export default function AdminCatalogPage() {
  const [conductores, setConductores] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProveedor, setFilterProveedor] = useState('')
  const [filterMaterial, setFilterMaterial] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Conductor | null>(null)
  const [form, setForm] = useState<Partial<Conductor>>(EMPTY)
  const [saving, setSaving] = useState(false)

  async function loadCatalog() {
    setLoading(true)
    try {
      const data = await getAdminCatalog({
        proveedor: filterProveedor || undefined,
        material: filterMaterial || undefined,
      })
      setConductores(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCatalog() }, [filterProveedor, filterMaterial])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(c: Conductor) {
    setEditing(c)
    setForm({ ...c })
    setShowForm(true)
  }

  function setField(key: keyof Conductor, value: string) {
    const numFields = ['seccion_mm2', 'resistencia_dc_20', 'i_max_ducto', 'i_max_aire', 'diametro_ext_mm', 'peso_kg_km', 'tension_nom_v', 'temp_max_c']
    setForm(prev => ({
      ...prev,
      [key]: numFields.includes(key) ? (value === '' ? undefined : Number(value)) : value,
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateConductor(editing.id, form)
        setConductores(prev => prev.map(c => c.id === updated.id ? updated : c))
      } else {
        const created = await createConductor(form)
        setConductores(prev => [created, ...prev])
      }
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Desactivar este conductor?')) return
    await deleteConductor(id)
    setConductores(prev => prev.map(c => c.id === id ? { ...c, activo: false } : c))
  }

  const proveedores = Array.from(new Set(conductores.map(c => c.proveedor).filter(Boolean))) as string[]

  return (
    <div style={{ padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 22, color: 'var(--text)', margin: '0 0 6px' }}>
            Catálogo de conductores
          </h1>
          <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: 'var(--text3)', margin: 0 }}>
            {conductores.length} conductores
          </p>
        </div>
        <button onClick={openCreate} className="btn-calc" style={{ width: 'auto', padding: '9px 20px' }}>
          + Agregar conductor
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="select-wrap" style={{ minWidth: 160 }}>
          <select className="form-select" value={filterProveedor} onChange={e => setFilterProveedor(e.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => <option key={p} value={p!}>{p}</option>)}
          </select>
        </div>
        <div className="select-wrap" style={{ minWidth: 120 }}>
          <select className="form-select" value={filterMaterial} onChange={e => setFilterMaterial(e.target.value)}>
            <option value="">Cu + Al</option>
            <option value="cu">Cobre (Cu)</option>
            <option value="al">Aluminio (Al)</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>Cargando...</div>
      ) : (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '130px 80px 70px 70px 80px 80px 80px 60px 80px',
            padding: '10px 16px',
            background: 'var(--bg3)',
            borderBottom: '1px solid var(--border)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            <span>Proveedor</span>
            <span>Tipo</span>
            <span>AWG</span>
            <span>mm²</span>
            <span>Material</span>
            <span>Imax ducto</span>
            <span>Imax aire</span>
            <span>Estado</span>
            <span>Acciones</span>
          </div>

          {conductores.map(c => (
            <div key={c.id} style={{
              display: 'grid',
              gridTemplateColumns: '130px 80px 70px 70px 80px 80px 80px 60px 80px',
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              alignItems: 'center',
              opacity: c.activo ? 1 : 0.45,
            }}>
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{c.proveedor}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)' }}>{c.tipo}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)' }}>{c.calibre_awg}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--accent)' }}>{c.seccion_mm2}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)', textTransform: 'uppercase' }}>{c.material}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)' }}>{c.i_max_ducto} A</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--text2)' }}>{c.i_max_aire} A</span>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
                color: c.activo ? 'var(--green)' : 'var(--text3)',
              }}>
                {c.activo ? 'Activo' : 'Inactivo'}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => openEdit(c)}
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    padding: '3px 8px', borderRadius: 4,
                    border: '1px solid var(--border)', background: 'transparent',
                    color: 'var(--text2)', cursor: 'pointer',
                  }}
                >
                  Editar
                </button>
                {c.activo && (
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                      padding: '3px 8px', borderRadius: 4,
                      border: '1px solid var(--red-bdr)', background: 'transparent',
                      color: 'var(--red)', cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Form lateral */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
          zIndex: 100, padding: 0,
        }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{
            width: 420, height: '100vh', overflow: 'auto',
            background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
            padding: '28px 28px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600, fontSize: 16, color: 'var(--text)', margin: 0 }}>
                {editing ? 'Editar conductor' : 'Nuevo conductor'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
            </div>

            <Input label="Proveedor" value={form.proveedor} onChange={v => setField('proveedor', v)} />
            <Input label="Tipo (THW, THHN...)" value={form.tipo} onChange={v => setField('tipo', v)} />
            <Input label="Calibre AWG" value={form.calibre_awg} onChange={v => setField('calibre_awg', v)} />
            <Input label="Sección mm²" value={form.seccion_mm2} onChange={v => setField('seccion_mm2', v)} type="number" />

            <div className="form-group">
              <label className="form-label">Material</label>
              <div className="select-wrap">
                <select className="form-select" value={form.material ?? 'cu'} onChange={e => setField('material', e.target.value)}>
                  <option value="cu">Cobre (Cu)</option>
                  <option value="al">Aluminio (Al)</option>
                </select>
              </div>
            </div>

            <Input label="Resistencia DC 20°C (Ω/km)" value={form.resistencia_dc_20} onChange={v => setField('resistencia_dc_20', v)} type="number" />
            <Input label="Imax en ducto (A)" value={form.i_max_ducto} onChange={v => setField('i_max_ducto', v)} type="number" />
            <Input label="Imax al aire (A)" value={form.i_max_aire} onChange={v => setField('i_max_aire', v)} type="number" />
            <Input label="Diámetro ext. (mm)" value={form.diametro_ext_mm} onChange={v => setField('diametro_ext_mm', v)} type="number" />
            <Input label="Peso (kg/km)" value={form.peso_kg_km} onChange={v => setField('peso_kg_km', v)} type="number" />
            <Input label="Tensión nominal (V)" value={form.tension_nom_v} onChange={v => setField('tension_nom_v', v)} type="number" />
            <Input label="Temp. máx. (°C)" value={form.temp_max_c} onChange={v => setField('temp_max_c', v)} type="number" />
            <Input label="Norma referencia" value={form.norma_ref} onChange={v => setField('norma_ref', v)} />
            <Input label="Versión catálogo" value={form.version_catalogo} onChange={v => setField('version_catalogo', v)} />

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.certificacion_sec ?? false} onChange={e => setForm(p => ({ ...p, certificacion_sec: e.target.checked }))} />
                Cert. SEC
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.activo ?? true} onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))} />
                Activo
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={handleSave} disabled={saving} className="btn-calc" style={{ flex: 1 }}>
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear conductor'}
              </button>
              <button onClick={() => setShowForm(false)} style={{
                padding: '10px 16px', borderRadius: 'var(--r)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--text2)', cursor: 'pointer',
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 13,
              }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
