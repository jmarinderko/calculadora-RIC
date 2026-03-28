# Guía de Deployment en Railway — RIC Conductor SaaS

## Tiempo estimado: 45-60 minutos

---

## Paso 1 — Preparar el repositorio

```bash
cd ric-saas
git init
git add .
git commit -m "feat: initial RIC Conductor SaaS"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/ric-conductor-saas.git
git push -u origin main
```

---

## Paso 2 — Crear cuenta y proyecto Railway

1. Ve a **railway.app** → Sign up con GitHub
2. Click en **"New Project"**
3. Selecciona **"Deploy from GitHub repo"**
4. Autoriza acceso a `ric-conductor-saas`

Railway creará el proyecto vacío. Luego agregaremos servicios uno a uno.

---

## Paso 3 — Crear PostgreSQL

En el panel del proyecto Railway:

1. Click **"+ Add Service"** → **"Database"** → **"PostgreSQL"**
2. Railway lo crea automáticamente
3. Ve a la tab **"Variables"** del servicio PostgreSQL
4. Copia el valor de `DATABASE_URL` — lo necesitarás para el backend

---

## Paso 4 — Crear Redis

1. Click **"+ Add Service"** → **"Database"** → **"Redis"**
2. Railway lo crea automáticamente
3. Copia el valor de `REDIS_URL` desde la tab Variables

---

## Paso 5 — Crear servicio Backend (FastAPI)

1. Click **"+ Add Service"** → **"GitHub Repo"**
2. Selecciona `ric-conductor-saas`
3. En **"Root Directory"** escribe: `backend`
4. Railway detecta el Dockerfile automáticamente

Luego ve a **Settings** → **"Root Directory"** y confirma `backend`.

### Variables de entorno del backend

Ve a la tab **"Variables"** del servicio backend y agrega:

```
DATABASE_URL        = (pegar el valor de PostgreSQL)
REDIS_URL           = (pegar el valor de Redis)
JWT_SECRET          = (generar: openssl rand -hex 32)
STRIPE_SECRET_KEY   = sk_test_...
STRIPE_WEBHOOK_SECRET = whsec_...
ENVIRONMENT         = production
LOG_LEVEL           = INFO
PDF_SERVICE_URL     = (dejar vacío por ahora, completar después)
```

> **Tip Railway**: puedes hacer referencia a variables de otros servicios con
> `${{Postgres.DATABASE_URL}}` y `${{Redis.REDIS_URL}}` directamente.

---

## Paso 6 — Crear servicio PDF

1. Click **"+ Add Service"** → **"GitHub Repo"** → mismo repo
2. **Root Directory**: `pdf-service`
3. Variables:
   ```
   NODE_ENV = production
   ```
4. Una vez desplegado, copia su URL interna y agrégala al backend:
   ```
   PDF_SERVICE_URL = https://TU-PDF-SERVICE.railway.internal
   ```

> Railway tiene red interna entre servicios del mismo proyecto.
> Usa el dominio `.railway.internal` para comunicación sin pasar por internet.

---

## Paso 7 — Crear servicio Frontend (Next.js)

1. Click **"+ Add Service"** → **"GitHub Repo"** → mismo repo
2. **Root Directory**: `frontend`
3. Variables:
   ```
   NEXT_PUBLIC_API_URL   = https://TU-BACKEND.up.railway.app
   NEXTAUTH_URL          = https://TU-FRONTEND.up.railway.app
   NEXTAUTH_SECRET       = (generar: openssl rand -hex 32)
   ```
4. En **Build Arguments** agrega:
   ```
   NEXT_PUBLIC_API_URL = https://TU-BACKEND.up.railway.app
   ```

---

## Paso 8 — Inicializar la base de datos

Una vez que el backend esté desplegado y corriendo, inicializa la BD:

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Vincular al proyecto
railway link

# Ejecutar script de init (crea tablas + carga catálogo)
railway run --service ric-backend python scripts/init_db.py --seed-proveedores
```

Verifica que funcionó:
```bash
railway run --service ric-backend python -c "
import asyncio
from app.db.session import init_db
asyncio.run(init_db())
print('BD OK')
"
```

---

## Paso 9 — Verificar el deploy

```bash
# Health check backend
curl https://TU-BACKEND.up.railway.app/api/health

# Probar cálculo RIC
curl -X POST https://TU-BACKEND.up.railway.app/api/calc/conductor \
  -H "Content-Type: application/json" \
  -d '{
    "sistema": "trifasico",
    "tension_v": 380,
    "potencia_kw": 15,
    "factor_potencia": 0.85,
    "longitud_m": 80,
    "factor_demanda": 1.0,
    "tipo_circuito": "fuerza",
    "material": "cu",
    "tipo_canalizacion": "ducto_pvc",
    "temp_ambiente_c": 30,
    "circuitos_agrupados": 1,
    "msnm": 0,
    "montaje": "vista",
    "cables_por_fase": 0
  }'
```

Respuesta esperada: `{"ok": true, "resultado": {...}, "advertencias": []}`

---

## Paso 10 — Dominio personalizado (opcional)

1. En Railway, ve al servicio **frontend** → **Settings** → **Domains**
2. Click **"Add Custom Domain"**
3. Agrega `riconductor.cl` (o el dominio que tengas)
4. Railway te entrega los registros DNS a configurar en tu registrador

---

## Variables de entorno completas por servicio

### Backend
| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `PDF_SERVICE_URL` | `https://ric-pdf.railway.internal` |
| `ENVIRONMENT` | `production` |
| `LOG_LEVEL` | `INFO` |
| `ANTHROPIC_API_KEY` | `sk-ant-...` (opcional, módulo IA v2) |

### Frontend
| Variable | Valor |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | URL pública del backend |
| `NEXTAUTH_URL` | URL pública del frontend |
| `NEXTAUTH_SECRET` | `openssl rand -hex 32` |

### PDF Service
| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |

---

## Costos estimados Railway

| Servicio | Costo aprox. |
|----------|-------------|
| Backend FastAPI | $5–10/mes |
| PostgreSQL | $5/mes |
| Redis | $3/mes |
| PDF Service | $3–7/mes |
| Frontend Next.js | $5–8/mes |
| **Total MVP** | **~$21–33/mes** |

Railway cobra por uso real (CPU + RAM + egress). Los primeros $5 son gratis por servicio en el plan Hobby ($20/mes base que incluye créditos).

---

## Troubleshooting común

### Backend no arranca
```bash
# Ver logs en tiempo real
railway logs --service ric-backend

# Error común: DATABASE_URL no configurada
# Solución: verificar que la variable esté en la tab Variables del servicio
```

### PDF service falla con Chromium
```bash
# El Dockerfile ya instala las dependencias de Chromium
# Si falla, verificar que PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium esté configurado
railway run --service ric-pdf node -e "const p=require('puppeteer'); p.launch().then(b=>{ console.log('OK'); b.close(); })"
```

### Frontend no conecta con backend
```bash
# Verificar que NEXT_PUBLIC_API_URL esté correcta (URL pública, no interna)
# El frontend corre en el browser del usuario — no puede usar .railway.internal
echo $NEXT_PUBLIC_API_URL  # debe ser https://...up.railway.app
```

### BD no inicializada
```bash
railway run --service ric-backend python scripts/init_db.py
```

---

## Migración futura a Azure

Cuando el MRR supere ~$3.000/mes, migrar es directo:
1. Los Dockerfiles son idénticos → mismo build
2. Cambiar variables de entorno al equivalente Azure
3. Actualizar DNS
4. Tiempo estimado de migración: 1 día

El archivo `infra/azure/main.bicep` ya está listo para ese momento.
