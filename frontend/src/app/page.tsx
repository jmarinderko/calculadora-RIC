import Link from 'next/link'
import LandingNavbar from '@/components/landing/LandingNavbar'

// ─── Datos ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: '⚡',
    title: 'Motor RIC Baja Tensión',
    desc: 'Cálculo térmico Art. 5.3 con factores Ft, Fg, Fa. 7 tipos de canalización, sistemas mono/bi/trifásico, estrés térmico IEC 60949.',
    tag: 'RIC',
  },
  {
    icon: '🔌',
    title: 'Módulo MT/AT',
    desc: 'Conductores 1–36 kV con cálculo de impedancia IEC. Aislamientos XLPE/EPR, pantallas metálicas, ductos y directo enterrado.',
    tag: 'Media y alta tensión',
  },
  {
    icon: '☀️',
    title: 'ERNC / Fotovoltaico',
    desc: 'Strings DC, inversor-tablero AC e inyección a red. Factor de simultaneidad para generación distribuida conforme norma SEC.',
    tag: 'Generación distribuida',
  },
  {
    icon: '📄',
    title: 'PDF Memoria de Cálculo',
    desc: 'Exporta la memoria de cálculo en formato oficial SEC con todos los parámetros, resultados y referencias normativas.',
    tag: 'Formato SEC',
  },
  {
    icon: '📐',
    title: 'Diagrama Unifilar SVG',
    desc: 'Generación automática del diagrama unifilar desde los resultados del cálculo. Exporta en SVG o PNG con simbología IEC.',
    tag: 'Generación automática',
  },
  {
    icon: '📁',
    title: 'Proyectos e Historial',
    desc: 'Organiza tus cálculos por proyecto. Historial completo con inputs y resultados. Acceso desde cualquier dispositivo.',
    tag: 'Multi-proyecto',
  },
]

const plans = [
  {
    name: 'Free',
    price: '0',
    period: 'siempre gratis',
    color: 'var(--text2)',
    borderColor: 'var(--border)',
    items: [
      '3 proyectos activos',
      'Cálculo BT, MT/AT, ERNC',
      'Diagrama unifilar SVG',
      'Historial 7 días',
      'Sin exportación PDF',
    ],
    cta: 'Crear cuenta gratis',
    href: '/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '19',
    period: 'USD / mes',
    color: 'var(--accent)',
    borderColor: 'var(--accent)',
    items: [
      'Proyectos ilimitados',
      'Cálculo BT, MT/AT, ERNC',
      'Diagrama unifilar SVG',
      'Historial 90 días',
      'PDF Memoria SEC incluido',
    ],
    cta: 'Empezar con Pro',
    href: '/register',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '59',
    period: 'USD / mes',
    color: 'var(--blue)',
    borderColor: 'var(--blue)',
    items: [
      'Hasta 20 usuarios',
      'Todo lo de Pro',
      'Historial ilimitado',
      'API pública REST',
      'Exportación BIM DXF/IFC',
    ],
    cta: 'Contactar',
    href: '/register',
    highlight: false,
  },
]

// ─── Componentes internos ─────────────────────────────────────────────────────

function Tag({ children, color = 'var(--text3)' }: { children: string; color?: string }) {
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10,
      fontWeight: 500,
      color,
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: 20,
      padding: '2px 9px',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    }}>
      {children}
    </span>
  )
}

function CheckItem({ children }: { children: string }) {
  return (
    <li style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: 13,
      color: 'var(--text2)',
      marginBottom: 8,
      listStyle: 'none',
    }}>
      <span style={{ color: 'var(--green)', flexShrink: 0, marginTop: 1 }}>✓</span>
      {children}
    </li>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <LandingNavbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '80px 24px 72px',
        textAlign: 'center',
      }}>
        <Tag color="var(--accent)">RIC Chile</Tag>

        <h1 style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontWeight: 600,
          fontSize: 'clamp(32px, 5vw, 52px)',
          color: 'var(--text)',
          lineHeight: 1.15,
          margin: '20px 0 18px',
          letterSpacing: '-0.02em',
        }}>
          Calculadora de Conductores<br />
          <span style={{ color: 'var(--accent)' }}>Eléctricos para Proyectos SEC</span>
        </h1>

        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 17,
          color: 'var(--text2)',
          maxWidth: 560,
          margin: '0 auto 36px',
          lineHeight: 1.7,
        }}>
          Dimensionamiento de conductores BT, MT/AT y ERNC conforme a norma RIC.
          Memoria de cálculo SEC en PDF. Para ingenieros eléctricos en Chile.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 600,
            fontSize: 14,
            padding: '12px 28px',
            borderRadius: 'var(--r)',
            background: 'var(--accent)',
            color: '#000',
            textDecoration: 'none',
          }}>
            Comenzar gratis →
          </Link>
          <Link href="/login" style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            padding: '12px 28px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            textDecoration: 'none',
            background: 'transparent',
          }}>
            Ya tengo cuenta
          </Link>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 40,
          justifyContent: 'center',
          marginTop: 56,
          flexWrap: 'wrap',
        }}>
          {[
            { val: '~4.200', label: 'ingenieros eléctricos en Chile' },
            { val: 'Art. 5.3', label: 'RIC RIC' },
            { val: '3 módulos', label: 'BT · MT/AT · ERNC' },
          ].map(({ val, label }) => (
            <div key={val} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 22,
                fontWeight: 600,
                color: 'var(--accent)',
              }}>{val}</div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: 'var(--text3)',
                marginTop: 4,
              }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '0 24px' }} />

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Tag>Funcionalidades</Tag>
          <h2 style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600,
            fontSize: 28,
            color: 'var(--text)',
            margin: '14px 0 8px',
            letterSpacing: '-0.01em',
          }}>
            Todo lo que necesita tu proyecto eléctrico
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 15,
            color: 'var(--text3)',
          }}>
            Motor de cálculo portado directamente desde la norma RIC chilena
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}>
          {features.map((f) => (
            <div key={f.title} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r)',
              padding: '20px 22px',
            }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: 'var(--text)',
                marginBottom: 8,
              }}>{f.title}</div>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                color: 'var(--text2)',
                lineHeight: 1.65,
                margin: '0 0 14px',
              }}>{f.desc}</p>
              <Tag>{f.tag}</Tag>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '0 24px' }} />

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Tag>Planes</Tag>
          <h2 style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600,
            fontSize: 28,
            color: 'var(--text)',
            margin: '14px 0 8px',
            letterSpacing: '-0.01em',
          }}>
            Precios simples y transparentes
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 15,
            color: 'var(--text3)',
          }}>
            Empieza gratis, escala cuando lo necesites
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          alignItems: 'start',
        }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{
              background: plan.highlight ? 'rgba(240,180,41,0.04)' : 'var(--bg2)',
              border: `1px solid ${plan.borderColor}`,
              borderRadius: 'var(--r)',
              padding: '28px 24px',
              position: 'relative',
            }}>
              {plan.highlight && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 12px',
                  background: 'var(--accent)',
                  color: '#000',
                  borderRadius: 20,
                  whiteSpace: 'nowrap',
                }}>
                  MÁS POPULAR
                </div>
              )}

              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: plan.color,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 12,
              }}>{plan.name}</div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 38,
                  fontWeight: 600,
                  color: 'var(--text)',
                  lineHeight: 1,
                }}>
                  {plan.price === '0' ? 'Gratis' : `$${plan.price}`}
                </span>
              </div>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: 'var(--text3)',
                marginBottom: 24,
              }}>{plan.period}</div>

              <ul style={{ padding: 0, margin: '0 0 24px' }}>
                {plan.items.map((item) => (
                  <CheckItem key={item}>{item}</CheckItem>
                ))}
              </ul>

              <Link href={plan.href} style={{
                display: 'block',
                textAlign: 'center',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: 'var(--r)',
                background: plan.highlight ? 'var(--accent)' : 'transparent',
                color: plan.highlight ? '#000' : plan.color,
                border: `1px solid ${plan.borderColor}`,
                textDecoration: 'none',
              }}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--border)', margin: '0 24px' }} />

      {/* ── CTA Final ────────────────────────────────────────────────────── */}
      <section style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '72px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontWeight: 600,
          fontSize: 26,
          color: 'var(--text)',
          margin: '0 0 12px',
          letterSpacing: '-0.01em',
        }}>
          Empieza a calcular hoy
        </h2>
        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 15,
          color: 'var(--text3)',
          marginBottom: 28,
        }}>
          Sin tarjeta de crédito. 3 proyectos gratis para siempre.
        </p>
        <Link href="/register" style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontWeight: 600,
          fontSize: 14,
          padding: '12px 32px',
          borderRadius: 'var(--r)',
          background: 'var(--accent)',
          color: '#000',
          textDecoration: 'none',
          display: 'inline-block',
        }}>
          Crear cuenta gratis →
        </Link>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '24px',
        textAlign: 'center',
      }}>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          color: 'var(--text3)',
        }}>
          RIC Conductor.calc — RIC · Hecho para ingenieros eléctricos en Chile
        </span>
      </footer>
    </div>
  )
}
