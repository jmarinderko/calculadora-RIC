import axios from 'axios'
import { getSession } from 'next-auth/react'
import type {
  CalculatorInput, CalculatorResponse, Project, Calculation,
  ERNCTopologia, ERNCStringDCInput, ERNCAcInversorInput,
  ERNCGdRedBtInput, ERNCBateriasDCInput, ERNCResponse,
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
