'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getSubscription, createCheckout, createPortalSession } from '@/lib/api'
import type { SubscriptionInfo } from '@/types'

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: 'Gratis',
    period: '',
    color: 'var(--text2)',
    borderColor: 'var(--border)',
    features: ['3 proyectos', 'BT · MT/AT · ERNC', 'Diagrama unifilar', 'Sin PDF export', 'Historial 7 días'],
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$19',
    period: 'USD/mes',
    color: 'var(--accent)',
    borderColor: 'var(--accent)',
    features: ['Proyectos ilimitados', 'BT · MT/AT · ERNC', 'Diagrama unifilar', 'PDF Memoria SEC', 'Historial 90 días'],
  },
  {
    id: 'enterprise' as const,
    name: 'Enterprise',
    price: '$59',
    period: 'USD/mes',
    color: 'var(--blue)',
    borderColor: 'var(--blue)',
    features: ['20 usuarios', 'Todo lo de Pro', 'Historial ilimitado', 'API pública REST', 'Exportación BIM'],
  },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    active:   { color: 'var(--green)', bg: 'var(--green-bg)', label: 'Activa' },
    trialing: { color: 'var(--blue)',  bg: 'var(--blue-bg)',  label: 'Trial' },
    past_due: { color: 'var(--accent)',bg: 'rgba(240,180,41,0.08)', label: 'Pago pendiente' },
    canceled: { color: 'var(--red)',   bg: 'var(--red-bg)',   label: 'Cancelada' },
    inactive: { color: 'var(--text3)', bg: 'var(--bg3)',      label: 'Inactiva' },
  }
  const s = map[status] ?? map.inactive
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      color: s.color,
      background: s.bg,
    }}>
      {s.label}
    </span>
  )
}

export default function BillingPage() {
  const searchParams = useSearchParams()
  const [sub, setSub] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const success = searchParams.get('success') === '1'

  useEffect(() => {
    getSubscription()
      .then(setSub)
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(plan: 'pro' | 'enterprise') {
    setActionLoading(plan)
    try {
      const url = await createCheckout(plan)
      window.location.href = url
    } catch {
      setActionLoading(null)
    }
  }

  async function handlePortal() {
    setActionLoading('portal')
    try {
      const url = await createPortalSession()
      window.location.href = url
    } catch {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>
        Cargando...
      </div>
    )
  }

  const currentPlan = sub?.plan_type ?? 'free'

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontWeight: 600,
          fontSize: 22,
          color: 'var(--text)',
          margin: '0 0 6px',
        }}>
          Plan y facturación
        </h1>
        <p style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14, color: 'var(--text3)', margin: 0 }}>
          Gestiona tu suscripción y método de pago
        </p>
      </div>

      {/* Mensaje de éxito */}
      {success && (
        <div className="info-box" style={{ marginBottom: 24 }}>
          ¡Suscripción activada correctamente! Tu plan ha sido actualizado.
        </div>
      )}

      {/* Plan actual */}
      {sub && (
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          padding: '20px 24px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <div className="panel-title" style={{ marginBottom: 8 }}>Plan actual</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--text)',
                textTransform: 'capitalize',
              }}>
                {sub.plan_type}
              </span>
              <StatusBadge status={sub.subscription_status} />
            </div>
          </div>
          {sub.stripe_customer_id && (
            <button
              onClick={handlePortal}
              disabled={actionLoading === 'portal'}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                padding: '9px 18px',
                borderRadius: 'var(--r)',
                border: '1px solid var(--border2)',
                background: 'transparent',
                color: 'var(--text2)',
                cursor: actionLoading === 'portal' ? 'not-allowed' : 'pointer',
                opacity: actionLoading === 'portal' ? 0.6 : 1,
              }}
            >
              {actionLoading === 'portal' ? 'Redirigiendo...' : 'Gestionar suscripción →'}
            </button>
          )}
        </div>
      )}

      {/* Planes */}
      <div className="panel-title">Cambiar plan</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan
          const isUpgrade = plan.id !== 'free' && plan.id !== currentPlan

          return (
            <div key={plan.id} style={{
              background: isCurrent ? 'rgba(240,180,41,0.04)' : 'var(--bg2)',
              border: `1px solid ${isCurrent ? plan.borderColor : 'var(--border)'}`,
              borderRadius: 'var(--r)',
              padding: '20px 20px',
            }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: plan.color,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 10,
              }}>{plan.name}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 16 }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'var(--text)',
                  lineHeight: 1,
                }}>{plan.price}</span>
                {plan.period && (
                  <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, color: 'var(--text3)' }}>
                    {plan.period}
                  </span>
                )}
              </div>

              <ul style={{ padding: 0, margin: '0 0 20px', listStyle: 'none' }}>
                {plan.features.map((f) => (
                  <li key={f} style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 12,
                    color: 'var(--text2)',
                    marginBottom: 6,
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start',
                  }}>
                    <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div style={{
                  textAlign: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: 'var(--accent)',
                  padding: '8px',
                  borderRadius: 'var(--r)',
                  border: '1px solid var(--accent)',
                }}>
                  Plan actual ✓
                </div>
              ) : isUpgrade ? (
                <button
                  onClick={() => handleUpgrade(plan.id as 'pro' | 'enterprise')}
                  disabled={!!actionLoading}
                  style={{
                    width: '100%',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '9px',
                    borderRadius: 'var(--r)',
                    border: `1px solid ${plan.borderColor}`,
                    background: plan.id === 'pro' ? 'var(--accent)' : 'transparent',
                    color: plan.id === 'pro' ? '#000' : plan.color,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading === plan.id ? 'Redirigiendo...' : `Cambiar a ${plan.name} →`}
                </button>
              ) : (
                <div style={{
                  textAlign: 'center',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 12,
                  color: 'var(--text3)',
                  padding: '8px',
                }}>
                  Plan base
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Nota */}
      <p style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        color: 'var(--text3)',
        marginTop: 24,
        lineHeight: 1.7,
      }}>
        Los pagos son procesados de forma segura por Stripe. Puedes cancelar en cualquier momento desde el portal de facturación.
      </p>
    </div>
  )
}
