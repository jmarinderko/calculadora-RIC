'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPublicCalculation } from '@/lib/api'
import type { PublicCalculation } from '@/types'

function Row({ label, value, unit }: { label: string; value: unknown; unit?: string }) {
  return (
    <div className="grid grid-cols-2 py-2 border-b border-[#21262D] last:border-0 text-sm">
      <span className="text-[#8B949E]">{label}</span>
      <span className="font-mono text-[#E6EDF3]">
        {value !== null && value !== undefined ? String(value) : '—'}
        {unit ? <span className="text-[#8B949E] ml-1">{unit}</span> : null}
      </span>
    </div>
  )
}

export default function SharedCalculationPage() {
  const { token } = useParams<{ token: string }>()
  const [calc, setCalc] = useState<PublicCalculation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPublicCalculation(token)
      .then(setCalc)
      .catch(() => setError('Cálculo no encontrado o link inválido.'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <p className="text-[#8B949E] text-sm">Cargando…</p>
      </div>
    )
  }

  if (error || !calc) {
    return (
      <div className="min-h-screen bg-[#0D1117] flex items-center justify-center">
        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-8 text-center max-w-sm">
          <p className="text-[#F85149] text-sm font-semibold mb-2">Link inválido</p>
          <p className="text-[#8B949E] text-xs">{error}</p>
        </div>
      </div>
    )
  }

  const inp = calc.input_data as Record<string, any>
  const res = calc.result_data as Record<string, any>

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-base font-semibold">
              RIC Conductor<span className="text-[#F0B429]">.calc</span>
            </div>
            <p className="text-xs text-[#8B949E] mt-0.5">NCh Elec 4/2003 — Cálculo compartido (solo lectura)</p>
          </div>
          <span className={`text-sm font-bold px-3 py-1 rounded border ${
            calc.cumple_ric
              ? 'text-[#3FB950] border-[#3FB95040] bg-[#3FB95010]'
              : 'text-[#F85149] border-[#F8514940] bg-[#F8514910]'
          }`}>
            {calc.cumple_ric ? 'CUMPLE RIC' : 'NO CUMPLE'}
          </span>
        </div>

        {/* Project / calc info */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4">
          <p className="text-xs text-[#8B949E] mb-0.5">Proyecto</p>
          <p className="text-sm font-medium">{calc.project_name || '—'}</p>
          <p className="text-xs text-[#8B949E] mt-2 mb-0.5">Cálculo</p>
          <p className="text-sm font-medium">{calc.name || 'Sin nombre'}</p>
          <p className="text-xs text-[#8B949E] mt-2">
            {new Date(calc.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Inputs */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4">
          <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Datos de entrada</h2>
          <Row label="Sistema" value={String(inp.sistema || '').charAt(0).toUpperCase() + String(inp.sistema || '').slice(1)} />
          <Row label="Tensión nominal" value={inp.tension_v} unit="V" />
          <Row label="Potencia" value={inp.potencia_kw} unit="kW" />
          <Row label="Factor de potencia" value={inp.factor_potencia} />
          <Row label="Factor de demanda" value={inp.factor_demanda} />
          <Row label="Longitud" value={inp.longitud_m} unit="m" />
          <Row label="Material" value={String(inp.material || '').toUpperCase()} />
          <Row label="Canalización" value={String(inp.tipo_canalizacion || '').replace(/_/g, ' ')} />
          <Row label="Temperatura ambiente" value={inp.temp_ambiente_c} unit="°C" />
          <Row label="Circuitos agrupados" value={inp.circuitos_agrupados} />
          <Row label="Altitud" value={inp.msnm} unit="msnm" />
        </div>

        {/* Results */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4">
          <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Resultados</h2>
          <Row label="Sección seleccionada" value={calc.seccion_mm2} unit="mm²" />
          <Row label="Calibre AWG" value={res.calibre_awg} />
          <Row label="Corriente de diseño" value={res.i_diseno_a} unit="A" />
          <Row label="Corriente máx. corregida" value={res.i_max_corregida_a} unit="A" />
          <Row label="Caída de tensión" value={res.caida_pct} unit="%" />
          <Row label="Sección neutro" value={res.sec_neutro_mm2} unit="mm²" />
          <Row label="Sección tierra (PE)" value={res.sec_tierra_mm2} unit="mm²" />
        </div>

        {/* Correction factors */}
        <div className="bg-[#161B22] border border-[#30363D] rounded-lg p-4">
          <h2 className="text-xs font-semibold text-[#8B949E] uppercase tracking-wider mb-3">Factores de corrección</h2>
          <Row label="Ft (temperatura)" value={res.ft} />
          <Row label="Fg (agrupamiento)" value={res.fg} />
          <Row label="Fa (altitud)" value={res.fa} />
          <Row label="Factor total" value={res.factor_total} />
        </div>

        <p className="text-center text-xs text-[#6E7681] pt-2">
          Generado por RIC Conductor.calc — NCh Elec 4/2003 · Chile
        </p>
      </div>
    </div>
  )
}
