import Link from 'next/link'
import LandingNavbar from '@/components/landing/LandingNavbar'

// ─── Datos ────────────────────────────────────────────────────────────────────

const features = [
  {
    icon: '⚡',
    title: 'Motor RIC Baja Tensión',
    desc: 'Cálculo térmico Art. 5.3 con factores Ft, Fg, Fa. 7 tipos de canalización, sistemas mono/bi/trifásico, estrés térmico IEC 60949.',
    tag: 'RIC Art. 5.3',
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
    icon: '🌳',
    title: 'Árbol de Caída de Tensión',
    desc: 'Análisis de red ramificada con cálculo acumulativo de ΔV por tramo. Mono y trifásico. Identifica el tramo más crítico.',
    tag: 'Red ramificada',
  },
  {
    icon: '⏚',
    title: 'Puesta a Tierra',
    desc: 'Diseño de electrodos de jabalina, malla y cable horizontal conforme RIC. Verifica resistencia máxima admisible.',
    tag: 'RIC / IEC 60364',
  },
  {
    icon: '⊕',
    title: 'Factor de Potencia',
    desc: 'Cálculo de banco de condensadores para corrección de FP. Selección de banco estándar, ahorro energético y reducción de penalización.',
    tag: 'Corrección FP',
  },
  {
    icon: '💡',
    title: 'Iluminación Zonal',
    desc: 'Método de cavidades zonales para recintos interiores. Cálculo de luminarias necesarias conforme niveles mínimos NCh.',
    tag: 'NCh iluminación',
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
    desc: 'Generación automática del diagrama unifilar desde los resultados del cálculo. Exporta en SVG con simbología IEC.',
    tag: 'Generación automática',
  },
  {
    icon: '📁',
    title: 'Proyectos e Historial',
    desc: 'Organiza tus cálculos por proyecto con plantillas predefinidas. Historial completo accesible desde cualquier dispositivo.',
    tag: 'Multi-proyecto',
  },
]

const steps = [
  {
    num: '01',
    title: 'Ingresa los parámetros',
    desc: 'Potencia, tensión, tipo de instalación, material del conductor y condiciones de montaje. El formulario guía cada campo.',
  },
  {
    num: '02',
    title: 'Motor RIC calcula',
    desc: 'El motor aplica los criterios de corriente admisible y caída de tensión del reglamento RIC y entrega la sección mínima.',
  },
  {
    num: '03',
    title: 'Exporta la memoria',
    desc: 'Descarga la memoria de cálculo en PDF con formato SEC, diagrama unifilar SVG y tabla de resultados en Excel.',
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
      'Todos los módulos de cálculo',
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
      'Todos los módulos de cálculo',
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

const faqs = [
  {
    q: '¿Qué normativa aplica la calculadora?',
    a: 'Aplica el Reglamento de Instalaciones de Consumidores (RIC) vigente en Chile, emitido por la SEC. Para iluminación se referencian los niveles mínimos de la normativa NCh correspondiente. El motor BT implementa el Art. 5.3 del RIC.',
  },
  {
    q: '¿Los cálculos son válidos para presentar ante la SEC?',
    a: 'La herramienta genera la memoria de cálculo en el formato requerido por la SEC. El ingeniero proyectista es responsable de revisar y firmar los documentos. RIC Conductor automatiza los cálculos pero no reemplaza la firma profesional.',
  },
  {
    q: '¿Qué tipos de instalación puedo calcular?',
    a: 'Baja tensión (BT), media y alta tensión (MT/AT), sistemas ERNC/fotovoltaicos, redes ramificadas con árbol de caída de tensión, sistemas de puesta a tierra (jabalina, malla, cable horizontal), corrección de factor de potencia e iluminación interior.',
  },
  {
    q: '¿Puedo usar la herramienta gratis?',
    a: 'Sí. El plan Free incluye todos los módulos de cálculo, diagrama unifilar SVG e historial de 7 días para hasta 3 proyectos. Para exportar PDF de memoria SEC se requiere plan Pro.',
  },
  {
    q: '¿La plataforma funciona en dispositivos móviles?',
    a: 'Sí, la interfaz es responsiva y funciona en tablets y smartphones. Para trabajo profesional intensivo recomendamos pantalla de escritorio.',
  },
  {
    q: '¿Cómo funciona el cálculo de árbol de caída de tensión?',
    a: 'Permite definir múltiples tramos en serie/paralelo con su longitud, sección, corriente y sistema (mono/trifásico). El motor calcula la caída acumulada por tramo e identifica los tramos que superan el límite RIC.',
  },
  {
    q: '¿Qué incluye la exportación de PDF?',
    a: 'La memoria de cálculo PDF incluye: datos del proyecto, parámetros de entrada, factores de corrección aplicados, cálculo de corriente admisible, cálculo de caída de tensión, sección recomendada y referencias normativas RIC.',
  },
  {
    q: '¿Puedo compartir mis proyectos con otros ingenieros?',
    a: 'Sí. Los cálculos pueden compartirse mediante un enlace público temporal. El plan Enterprise permite equipos de hasta 20 usuarios con proyectos compartidos.',
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
      <section
        id="inicio"
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '80px 24px 72px',
          textAlign: 'center',
        }}
      >
        <Tag color="var(--accent)">RIC Chile — Conforme norma vigente</Tag>

        <h1 style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontWeight: 600,
          fontSize: 'clamp(30px, 5vw, 52px)',
          color: 'var(--text)',
          lineHeight: 1.15,
          margin: '20px 0 18px',
          letterSpacing: '-0.02em',
        }}>
          Calculadora de Conductores Eléctricos<br />
          <span style={{ color: 'var(--accent)' }}>para Proyectos SEC Chile</span>
        </h1>

        <p style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 17,
          color: 'var(--text2)',
          maxWidth: 580,
          margin: '0 auto 36px',
          lineHeight: 1.7,
        }}>
          Dimensionamiento de conductores BT, MT/AT y ERNC conforme a norma RIC.
          Puesta a tierra, factor de potencia, iluminación.
          Memoria de cálculo SEC en PDF lista para presentar.
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
          <Link href="#funcionalidades" style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 14,
            padding: '12px 28px',
            borderRadius: 'var(--r)',
            border: '1px solid var(--border2)',
            color: 'var(--text2)',
            textDecoration: 'none',
            background: 'transparent',
          }}>
            Ver funcionalidades
          </Link>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 48,
          justifyContent: 'center',
          marginTop: 60,
          flexWrap: 'wrap',
        }}>
          {[
            { val: '10+', label: 'módulos de cálculo' },
            { val: 'RIC', label: 'norma vigente Chile' },
            { val: 'PDF', label: 'memoria SEC oficial' },
          ].map(({ val, label }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 24,
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

      {/* ── Trust bar ────────────────────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
        padding: '12px 24px',
      }}>
        <div style={{
          maxWidth: 900,
          margin: '0 auto',
          display: 'flex',
          gap: 32,
          justifyContent: 'center',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          {[
            'Motor nativo RIC',
            'BT · MT/AT · ERNC',
            'Puesta a tierra IEC',
            'Memoria SEC en PDF',
            'Árbol caída de tensión',
            'Sin instalación',
          ].map((label) => (
            <span
              key={label}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                color: 'var(--text3)',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
              }}
            >
              ✓ {label}
            </span>
          ))}
        </div>
      </div>

      {/* ── Cómo funciona ─────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Tag>Flujo de trabajo</Tag>
          <h2 style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600,
            fontSize: 28,
            color: 'var(--text)',
            margin: '14px 0 8px',
            letterSpacing: '-0.01em',
          }}>
            De parámetros a memoria SEC en minutos
          </h2>
          <p style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontSize: 15,
            color: 'var(--text3)',
          }}>
            Sin hojas de cálculo, sin errores manuales
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}>
          {steps.map((step) => (
            <div key={step.num} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--accent)',
                letterSpacing: '0.1em',
              }}>
                {step.num}
              </span>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: 600,
                fontSize: 15,
                color: 'var(--text)',
              }}>
                {step.title}
              </div>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                color: 'var(--text2)',
                lineHeight: 1.65,
                margin: 0,
              }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: '1px solid var(--border)', margin: '0 24px' }} />

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="funcionalidades" style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
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

      <div style={{ borderTop: '1px solid var(--border)', margin: '0 24px' }} />

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section id="precios" style={{ maxWidth: 1100, margin: '0 auto', padding: '72px 24px' }}>
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

      <div style={{ borderTop: '1px solid var(--border)', margin: '0 24px' }} />

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" style={{ maxWidth: 760, margin: '0 auto', padding: '72px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Tag>FAQ</Tag>
          <h2 style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600,
            fontSize: 28,
            color: 'var(--text)',
            margin: '14px 0 8px',
            letterSpacing: '-0.01em',
          }}>
            Preguntas frecuentes
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, i) => (
            <div key={i} style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r)',
              padding: '20px 22px',
            }}>
              <div style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: 'var(--text)',
                marginBottom: 8,
              }}>
                {faq.q}
              </div>
              <p style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 13,
                color: 'var(--text2)',
                lineHeight: 1.7,
                margin: 0,
              }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

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
        padding: '28px 24px',
      }}>
        <div style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text)',
          }}>
            RIC Conductor<span style={{ color: 'var(--accent)' }}>.calc</span>
          </span>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              { href: '#funcionalidades', label: 'Funcionalidades' },
              { href: '#precios', label: 'Precios' },
              { href: '#faq', label: 'FAQ' },
              { href: '/login', label: 'Iniciar sesión' },
              { href: '/register', label: 'Registrarse' },
            ].map(({ href, label }) => (
              <Link key={label} href={href} style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 12,
                color: 'var(--text3)',
                textDecoration: 'none',
              }}>
                {label}
              </Link>
            ))}
          </div>

          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            color: 'var(--text3)',
          }}>
            Hecho para ingenieros eléctricos en Chile
          </span>
        </div>
      </footer>
    </div>
  )
}
