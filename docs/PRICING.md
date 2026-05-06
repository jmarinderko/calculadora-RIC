# Plan de cobro — RIC Conductor SaaS

Última actualización: 2026-05-06.

> **Estado**: definido pero NO implementado. El lanzamiento beta del 2026-05-06 fue gratuito. Implementación técnica en sprint pendiente (~32h).

## Tarifas

| Plan | Mensual CLP | Anual CLP | Mensual USD | Anual USD |
|---|---|---|---|---|
| Free | $0 | $0 | $0 | $0 |
| Pro | **$19.900** | **$199.000** (2 meses gratis) | $19 | $199 |
| Enterprise | **$59.900** | **$599.000** (2 meses gratis) | $59 | $599 |

**Notas**:
- IVA incluido (mercado chileno).
- Anual descuenta 2 meses (16% off).
- Trial Pro: 14 días sin tarjeta.

## Features por plan

| Categoría | Feature | Free | Pro | Enterprise |
|---|---|:---:|:---:|:---:|
| **Cálculo BT** | Calculadora RIC Art. 5.5 | ✅ | ✅ | ✅ |
| | Estrés térmico cortocircuito (IEC 60949) | ❌ | ✅ | ✅ |
| | Forzar sección manualmente | ❌ | ✅ | ✅ |
| **MT/AT** | Conductores 1-36 kV (IEC 60502-2) | ❌ | ✅ | ✅ |
| **ERNC** | Strings DC, AC inversor, GD red BT | ❌ | ✅ | ✅ |
| | Baterías DC | ❌ | ❌ | ✅ |
| **Otros módulos** | Puesta a tierra (1 electrodo) | ✅ | ✅ | ✅ |
| | Puesta a tierra (mallas, multi-electrodo) | ❌ | ✅ | ✅ |
| | Factor de potencia | ❌ | ✅ | ✅ |
| | Caída tensión árbol ramificado | ❌ | ✅ | ✅ |
| | Iluminación (cavidades zonales NCh) | ❌ | ✅ | ✅ |
| **Proyectos** | Proyectos activos | 3 | Ilimitados | Ilimitados |
| | Cálculos por proyecto | 10 | Ilimitados | Ilimitados |
| | Plantillas | Vivienda básica | 8 plantillas | 8 + crear propias |
| | Historial | 7 días | 90 días | Sin límite |
| **Exportación** | Diagrama unifilar SVG | ✅ con marca de agua | ✅ limpio | ✅ con logo cliente |
| | **Memoria SEC PDF** | ❌ | ✅ | ✅ con logo cliente |
| | Excel (XLSX) | ❌ | ✅ | ✅ |
| | Memoria proyecto consolidada PDF | ❌ | ✅ | ✅ |
| **Compartir** | Link público lectura | ❌ | ✅ | ✅ |
| **Mobile** | App Android (Play Store) | ✅ | ✅ | ✅ |
| | Modo offline | ❌ | ✅ | ✅ |
| **Equipo** | Usuarios incluidos | 1 | 1 | Hasta 10 |
| | Usuarios extra | — | — | $9.900 CLP/mes c/u |
| **Integraciones** | API REST | ❌ | ❌ | ✅ |
| | Webhooks | ❌ | ❌ | ✅ |
| **Soporte** | Canal | Email comunidad | Email 48h | Email 12h + WhatsApp |
| | SLA uptime | — | 99% | 99.9% |
| **Branding** | "Powered by RIC.calc" en outputs | ✅ visible | ✅ pequeño | ❌ removible |
| | Logo cliente en PDFs | ❌ | ❌ | ✅ |

## Límites técnicos

| Límite | Free | Pro | Enterprise |
|---|---|---|---|
| Cálculos guardados / mes | 30 hard | 500 soft | Ilimitado |
| PDFs generados / mes | 0 | 100 soft | Ilimitado |
| Storage proyectos | 50 MB | 1 GB | 10 GB |
| API calls / mes | — | — | 10.000 |

> "Hard" = bloqueo con upsell. "Soft" = alerta + sigue funcionando.

## Add-ons

| Add-on | Precio | Aplicable a |
|---|---|---|
| Pack PDF Memoria SEC (10 unidades) | $9.900 CLP | Free |
| Soporte premium 24×7 | $29.900 CLP/mes | Pro |
| Onboarding 1:1 (1h) | $49.900 CLP | Cualquiera |
| Branding (logo en PDFs sin Enterprise) | $9.900 CLP/mes | Pro |

## Política comercial

- **Cancelación**: anytime, sin penalty. Acceso hasta fin de período pagado.
- **Reembolso**: 30 días primera compra. Después prorrateado.
- **Cambio de plan**: upgrade prorrateado inmediato. Downgrade efectivo próximo ciclo.
- **Boleta/Factura**: SII electrónica automática.
- **Métodos de pago**: Webpay Plus (CLP), Stripe (USD), transferencia (Enterprise).

## Códigos promocionales

| Código | Beneficio | Uso |
|---|---|---|
| `BETA2026` | Pro gratis 3 meses | Testers iniciales |
| `LANZAMIENTO50` | 50% off primer año Pro | Primeros 100 customers |
| `ESTUDIANTE` | 70% off Pro con email .cl | Universidades |
| `COLEGIO_INGENIEROS` | 30% off Pro | Convenio Colegio Ingenieros Chile |

## Sprint de implementación (~32h)

| # | Trabajo | Tiempo | Dependencias |
|---|---|---|---|
| 1 | Migration: `User.plan` + `User.plan_expires_at` + `User.stripe_customer_id` | 1h | — |
| 2 | Decorador `@require_plan('pro'/'enterprise')` en endpoints | 2h | 1 |
| 3 | Frontend: badges de plan + locks visuales en features bloqueadas | 3h | 1 |
| 4 | Página `/billing` (ver plan, cancelar, ver invoices) | 4h | 1 |
| 5 | Stripe Checkout (sesión hosted) | 3h | 1 |
| 6 | Webhooks Stripe (`customer.subscription.*`, `invoice.*`) | 4h | 5 |
| 7 | Webpay Plus integración Transbank | 8h | 1 |
| 8 | Sistema de códigos promocionales | 2h | 5,7 |
| 9 | Email transaccional (Resend / SES) | 3h | 5,7 |
| 10 | Counter mensual de PDFs/cálculos | 2h | 1,2 |

## Notas de implementación

- Stripe primero (más simple) — Pro USD para internacional.
- Webpay después — Pro/Enterprise CLP para Chile.
- Boletas SII vía API (Toku, Bsale o desarrollo propio).
- Email vía Resend (más barato, mejor DX que SES).
- `INTERNAL_API_SECRET` ya configurado, usar para validar webhooks.
- Counter mensual con Redis (key con TTL al primero del mes).
