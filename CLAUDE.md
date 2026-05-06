# RIC Conductor SaaS — Contexto para Claude

> Este archivo es leído automáticamente por Claude Code al abrir este repo. Contiene el contexto necesario para retomar el proyecto sin perder información.

## Resumen

SaaS para cálculo de conductores eléctricos según norma RIC chilena (NCh Elec 4/2003). Convertido desde un prototipo HTML a una plataforma full-stack con web, mobile y PDF profesional.

**Owner**: Jose Marin (`jmarin.lizama@gmail.com`)
**Repo**: github.com/jmarinderko/calculadora-RIC
**Lanzamiento beta**: 2026-05-06 (free para testers del rubro)

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind + NextAuth.js |
| Backend | FastAPI Python 3.12 + SQLAlchemy async + Alembic + asyncpg |
| DB | PostgreSQL 16 |
| Cache | Redis 7 |
| PDF | Puppeteer Node.js microservicio (puerto 9000) |
| Mobile | Capacitor 8 (Android, iOS preparado) |
| PWA | next-pwa con IndexedDB offline |
| Tests | pytest (220 tests pasando), TypeScript strict |
| CI | GitHub Actions |
| Infra dev | Docker Compose |
| Infra prod | Railway (plan Hobby $5/mes) |

## Convenciones del proyecto

- **Código y variables**: inglés.
- **Comentarios y commits**: español.
- **UI**: textos en español (audiencia chilena).
- **Ramas**: `main` (Railway prod), `develop` (integración). Auto-deploy desde `main`.
- **Commits**: convencionales — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- **Secrets**: solo en `.env.example`, nunca hardcodeados.
- **Tests**: agregar test al fixear bug; mantener 100% pass.

## Estructura

```
codigo/
├── backend/           FastAPI + motor cálculo + tests
│   ├── app/
│   │   ├── api/routes/   Endpoints (auth, projects, calculations, reports, exports, admin)
│   │   ├── engine/       Motor de cálculo (calculator.py, ric_tables.py)
│   │   ├── db/           Models SQLAlchemy + session
│   │   └── services/     Email, etc.
│   ├── alembic/          Migraciones DB
│   ├── tests/            220 tests pytest
│   └── requirements.txt
├── frontend/          Next.js 14 + Capacitor mobile
│   ├── android/          [GITIGNORED] Plataforma nativa, regenerar con `npx cap add android`
│   ├── public/           manifest.json, icon.svg, sw.js (PWA)
│   ├── src/
│   │   ├── app/          App Router (login, dashboard, calculator, projects, etc.)
│   │   ├── components/
│   │   │   ├── layout/   Sidebar (drawer en mobile), Header (hamburguesa), SidebarContext
│   │   │   ├── landing/  LandingNavbar (drawer mobile)
│   │   │   └── calculator/  Forms y panels de resultado
│   │   └── lib/
│   │       ├── api.ts        Cliente axios — baseURL dinámica vía window.location
│   │       ├── auth.ts       NextAuth config (Credentials + Google condicional)
│   │       ├── platform.ts   Helpers nativos Capacitor (clipboard, filesystem)
│   │       └── offline/      IndexedDB + sync service
│   ├── capacitor.config.ts   URL emulador 10.0.2.2:3000
│   ├── next.config.js
│   ├── package.json
│   └── .env.local            [GITIGNORED] Configuración local
├── pdf-service/       Microservicio Puppeteer (puerto 9000)
├── db/                Seeds SQL (seed_ric_tables.sql, seed_proveedores.sql)
├── .github/workflows/ci.yml
├── docker-compose.yml
├── .env               [GITIGNORED] Compose env
└── .env.example
```

## Setup local desde cero

### Prerequisitos

- Node.js 20+
- Python 3.12
- Docker Desktop
- Git

### Pasos

```bash
# 1. Clone
git clone https://github.com/jmarinderko/calculadora-RIC.git
cd calculadora-RIC

# 2. Variables de entorno
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
# Editar .env y .env.local con valores reales (ver § Variables abajo)

# 3. Backend Python venv
cd backend
python -m venv .venv
source .venv/Scripts/activate  # Git Bash en Windows
# o: .venv\Scripts\activate.bat en cmd
pip install -r requirements.txt
cd ..

# 4. Frontend deps
cd frontend
npm install
cd ..

# 5. Levantar servicios DB + Redis + Backend + PDF
docker compose up -d postgres redis backend pdf-service

# 6. Esperar healthy y crear admin
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ric.cl","password":"admin123","full_name":"Admin"}'

docker exec ric_postgres psql -U ric_user -d ric_conductor \
  -c "UPDATE users SET is_admin = true WHERE email = 'admin@ric.cl';"

# 7. Levantar Next.js dev
cd frontend
npm run dev
# Abrir http://localhost:3000
```

### Setup mobile (Capacitor)

```bash
cd frontend
npm install @capacitor/android  # si no está
npx cap add android  # genera frontend/android/
NODE_ENV=development npx cap sync android
npx cap open android  # abre Android Studio
```

Recordar agregar `android:usesCleartextTraffic="true"` en `android/app/src/main/AndroidManifest.xml` para que el emulador llegue al dev server.

## Variables de entorno

### Backend (`.env` raíz)
```
POSTGRES_USER=ric_user
POSTGRES_PASSWORD=<cambiar en prod>
POSTGRES_DB=ric_conductor
DATABASE_URL=postgresql+asyncpg://ric_user:...@postgres:5432/ric_conductor
REDIS_URL=redis://redis:6379/0
JWT_SECRET=<openssl rand -hex 32>
ENVIRONMENT=development
BACKEND_CORS_ORIGINS=["http://localhost:3000","http://10.0.2.2:3000"]
PDF_SERVICE_URL=http://pdf-service:9000  # docker; en Railway: http://ample-passion.railway.internal:9000
INTERNAL_API_SECRET=<openssl rand -hex 32>  # MISMO valor que frontend
```

### Frontend (`frontend/.env.local`)
```
# NO definir NEXT_PUBLIC_API_URL en local — la detección dinámica usa window.location.hostname
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -hex 32>
INTERNAL_API_SECRET=<MISMO que backend>
# Opcionales para Google OAuth:
GOOGLE_CLIENT_ID=<google_client_id>
GOOGLE_CLIENT_SECRET=<google_client_secret>
```

## Despliegue Railway

5 servicios en proyecto Railway:
- `calculadora-RIC-Frontend` → Next.js (auto-deploy desde `main`).
- `calculadora-RIC-backend` → FastAPI.
- `ample-passion` → pdf-service (privado, puerto 9000 interno).
- `Postgres` → con volumen persistente.
- `Redis` → con volumen persistente.

**URLs**:
- Frontend: `https://earnest-integrity-production-e572.up.railway.app`
- Backend: `https://calculadora-ric-production-420c.up.railway.app`

**Variables Railway producción** (importantes, sin valores aquí):
- Frontend: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL` (URL pública del backend), `GOOGLE_CLIENT_ID/SECRET`, `INTERNAL_API_SECRET`.
- Backend: `DATABASE_URL`, `JWT_SECRET`, `PDF_SERVICE_URL=http://ample-passion.railway.internal:9000`, `INTERNAL_API_SECRET`, `BACKEND_CORS_ORIGINS=["https://...frontend...railway.app"]`, `ENVIRONMENT=production`.
- PDF: `PORT=9000`, `NODE_ENV=production`.

**Forzar rebuild en Railway** (no solo restart):
- Cambiar/agregar cualquier variable de entorno (ej: `FORCE_REBUILD=v1`).
- O push commit nuevo (incluso vacío: `git commit --allow-empty -m "..."`).

## Comandos comunes

| Tarea | Comando |
|---|---|
| Tests backend | `cd backend && pytest tests/ -v` |
| Type check frontend | `cd frontend && npx tsc --noEmit` |
| Lint frontend | `cd frontend && npm run lint` |
| Migraciones nuevas | `cd backend && alembic revision --autogenerate -m "..."` |
| Aplicar migraciones | `cd backend && alembic upgrade head` |
| Ver logs Docker | `docker compose logs -f backend` |
| Build mobile | `cd frontend && npm run cap:build` |
| Sync Android | `cd frontend && npx cap sync android` |

## Bugs/issues activos al 2026-05-06

- **React #418/#423 en producción**: agregamos `suppressHydrationWarning` en `<html>` y `<body>` (commit `634df1b`). Verificar con bundle hash nuevo. Si persiste, debug componente por componente.
- **PDF Memoria SEC**: requiere `PDF_SERVICE_URL=http://ample-passion.railway.internal:9000` (con `http://` y `:9000` literales).
- **CI**: arreglado en commit `0729286` (eslint config) + `f3755c6` (YAML quotes). Debe estar verde en GitHub Actions.

## Plan de cobro pendiente (ver `docs/PRICING.md`)

Free / Pro $19.900 CLP / Enterprise $59.900 CLP (con IVA). Sprint ~32h pendiente:
1. Migration `User.plan` + `User.plan_expires_at`.
2. Decorador `@require_plan('pro')` en endpoints gateados.
3. Frontend: badges + locks visuales por plan.
4. Página `/billing`.
5. Stripe Checkout + webhooks.
6. Webpay Plus (Transbank Chile).
7. Códigos promo, email transaccional, counters mensuales.

Lanzamiento beta del 2026-05-06 fue gratuito (códigos `BETA2026` Pro free 3 meses).

## Mobile (Capacitor + Play Store)

Pendiente para próxima fase. Dos caminos:
- **Camino A** (rápido): Capacitor "thin wrapper" que carga la URL Railway. Requiere internet siempre.
- **Camino B** (correcto): refactor a `output: export` (rutas dinámicas → query params, eliminar `/api/auth/[...nextauth]`, etc.). App realmente offline.

Para Play Store hace falta:
- Cuenta Google Play Developer ($25 USD único).
- Política de privacidad pública.
- Iconos 1024×1024 + screenshots.
- Keystore de producción (¡no perderlo!).
- Build `.aab` firmado.
- Internal Testing → Closed Testing → Production.

## Admin pre-creado en producción

- Email: `admin@ric.cl`
- Password: `admin123`
- `is_admin=true`

## Estilo de respuesta esperado de Claude

- **Concisas y directas**, español Chile.
- **Técnico** — el owner es ingeniero/dev, no necesita explicaciones de conceptos básicos.
- **Acciones concretas** > teoría. Mostrar el comando o diff exacto.
- **Verificar** con tests/lint/type-check antes de declarar trabajo terminado.
- **Confirmar antes de**: push, force operations, eliminar archivos, modificar prod.
