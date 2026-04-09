import axios from 'axios'
import { getSession } from 'next-auth/react'
import type {
  CalculatorInput, CalculatorResponse, CalculatorResult,
  Project, Calculation,
  MtatInput, MtatResponse,
  ERNCTopologia, ERNCStringDCInput, ERNCAcInversorInput,
  ERNCGdRedBtInput, ERNCBateriasDCInput, ERNCResponse,
  AdminStats, AdminUser, Conductor,
} from '@/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: API_BASE })

// Interceptor: agrega JWT en cada petición
api.interceptors.request.use(async (config) => {
  const session = await getSession()
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
  }
  return config
})

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginApi(email: string, password: string) {
  const res = await api.post<{ access_token: string }>('/api/auth/login', { email, password })
  return res.data
}

export async function registerApi(email: string, password: string, full_name?: string) {
  const res = await api.post<{ access_token: string }>('/api/auth/register', { email, password, full_name })
  return res.data
}

// ── Calculator ────────────────────────────────────────────────────────────────

export async function calcConductor(input: CalculatorInput): Promise<CalculatorResponse> {
  const res = await api.post<CalculatorResponse>('/api/calc/conductor', input)
  return res.data
}

export async function calcMtat(input: MtatInput): Promise<MtatResponse> {
  const res = await api.post<MtatResponse>('/api/calc/mtat', input)
  return res.data
}

// ── ERNC / FV Calculator ──────────────────────────────────────────────────────

type ERNCInputMap = {
  string_dc:   ERNCStringDCInput
  ac_inversor: ERNCAcInversorInput
  gd_red_bt:   ERNCGdRedBtInput
  baterias_dc: ERNCBateriasDCInput
}

export async function calcERNC<T extends ERNCTopologia>(
  topologia: T,
  datos: ERNCInputMap[T]
): Promise<ERNCResponse> {
  const body = { topologia, datos }
  const res = await api.post<ERNCResponse>('/api/calc/ernc', body)
  return res.data
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const res = await api.get<Project[]>('/api/projects')
  return res.data
}

export async function createProject(data: { name: string; description?: string; location?: string }): Promise<Project> {
  const res = await api.post<Project>('/api/projects', data)
  return res.data
}

export async function updateProject(id: string, data: { name: string; description?: string; location?: string }): Promise<Project> {
  const res = await api.put<Project>(`/api/projects/${id}`, data)
  return res.data
}

export async function deleteProject(id: string): Promise<void> {
  await api.delete(`/api/projects/${id}`)
}

export async function getCalculations(projectId: string): Promise<Calculation[]> {
  const res = await api.get<Calculation[]>(`/api/projects/${projectId}/calculations`)
  return res.data
}

export async function saveCalculation(
  projectId: string,
  name: string,
  input_data: CalculatorInput
): Promise<Calculation> {
  const res = await api.post<Calculation>(`/api/projects/${projectId}/calculations`, { name, input_data })
  return res.data
}

// ── Reports / PDF ─────────────────────────────────────────────────────────────

export interface ReportOut {
  id: string
  calculation_id: string
  created_at: string
}

export async function generateReport(calculationId: string): Promise<ReportOut> {
  const res = await api.post<ReportOut>(`/api/reports/${calculationId}/generate`)
  return res.data
}

/**
 * Descarga el PDF de la memoria de cálculo y dispara el diálogo de guardado.
 * Usa fetch directamente para manejar el blob binario.
 */
export async function downloadReportPdf(reportId: string, filename = 'memoria_calculo_RIC.pdf'): Promise<void> {
  const session = await getSession()
  const headers: Record<string, string> = {}
  if ((session as any)?.accessToken) {
    headers['Authorization'] = `Bearer ${(session as any).accessToken}`
  }
  const resp = await fetch(`${API_BASE}/api/reports/${reportId}/download`, { headers })
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: resp.statusText }))
    throw new Error((err as any).detail ?? 'Error al descargar el PDF')
  }
  const blob = await resp.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAdminStats(): Promise<AdminStats> {
  const res = await api.get<AdminStats>('/api/admin/stats')
  return res.data
}

export async function getAdminUsers(skip = 0, limit = 50): Promise<AdminUser[]> {
  const res = await api.get<AdminUser[]>('/api/admin/users', { params: { skip, limit } })
  return res.data
}

export async function updateAdminUser(id: string, data: { is_active?: boolean; is_admin?: boolean }): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/api/admin/users/${id}`, data)
  return res.data
}

export async function getAdminCatalog(filters?: { proveedor?: string; material?: string; activo?: boolean }): Promise<Conductor[]> {
  const res = await api.get<Conductor[]>('/api/admin/catalog', { params: filters })
  return res.data
}

export async function createConductor(data: Partial<Conductor>): Promise<Conductor> {
  const res = await api.post<Conductor>('/api/admin/catalog', data)
  return res.data
}

export async function updateConductor(id: string, data: Partial<Conductor>): Promise<Conductor> {
  const res = await api.put<Conductor>(`/api/admin/catalog/${id}`, data)
  return res.data
}

export async function deleteConductor(id: string): Promise<void> {
  await api.delete(`/api/admin/catalog/${id}`)
}

// ── Unifilar ──────────────────────────────────────────────────────────────────

/**
 * Solicita el diagrama unifilar SVG generado desde el resultado del cálculo.
 * Retorna el string SVG crudo (content-type: image/svg+xml).
 */
export async function getUnifilar(
  resultado: CalculatorResult,
  input_data: CalculatorInput
): Promise<string> {
  const res = await api.post('/api/unifilar/generate', { resultado, input_data }, {
    responseType: 'text',
    headers: { Accept: 'image/svg+xml' },
  })
  return res.data as string
}
