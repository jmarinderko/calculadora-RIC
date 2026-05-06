# Setup en otro computador — runbook

Tiempo estimado: **30-45 min** si todo va bien (depende velocidad de red para descargas).

## 1. Prerequisitos a instalar

| Software | Versión | Descarga |
|---|---|---|
| **Git** | 2.40+ | https://git-scm.com/ |
| **Node.js** | 20 LTS | https://nodejs.org/ |
| **Python** | 3.12 | https://www.python.org/downloads/ |
| **Docker Desktop** | última | https://www.docker.com/products/docker-desktop/ |
| **VS Code** (recomendado) | última | https://code.visualstudio.com/ |
| **Claude Code CLI** | última | https://claude.com/claude-code |
| **Android Studio** (opcional, para mobile) | Hedgehog+ | https://developer.android.com/studio |

Verificar instalación:
```bash
git --version
node --version  # v20.x
python --version  # 3.12.x
docker --version
```

## 2. Clone el repo

```bash
# Donde quieras (ej: ~/Desarrollos/)
git clone https://github.com/jmarinderko/calculadora-RIC.git
cd calculadora-RIC
```

## 3. Variables de entorno

### Backend / Compose
```bash
cp .env.example .env
# Editar .env con un editor:
#   POSTGRES_PASSWORD: cualquier string para dev local
#   JWT_SECRET: openssl rand -hex 32
#   INTERNAL_API_SECRET: openssl rand -hex 32  (mismo que frontend)
```

### Frontend
```bash
cp frontend/.env.local.example frontend/.env.local
# Editar frontend/.env.local con:
#   NEXTAUTH_SECRET: openssl rand -hex 32
#   INTERNAL_API_SECRET: el mismo del .env del backend
#   GOOGLE_CLIENT_ID y SECRET si quieres login Google en local
```

> 💡 Si no tienes `openssl` en Windows, usa: https://www.random.org/strings/ con 64 chars hex.

## 4. Levantar servicios Docker

```bash
docker compose up -d postgres redis backend pdf-service
```

Espera ~30s a que `Postgres` esté `healthy`. Verifica:
```bash
docker ps
# Debe mostrar: ric_postgres, ric_redis, ric_backend, ric_pdf — todos "healthy" o "Up"
```

Si `ric_backend` queda en restart loop, ver logs:
```bash
docker logs ric_backend --tail 30
```

Los errores comunes:
- `Connection refused postgres`: postgres no está healthy aún. Espera 1 min más.
- `password authentication failed`: borra el volumen y reinicia (¡cuidado, borra data!):
  ```bash
  docker compose down
  docker volume rm codigo_postgres_data
  docker compose up -d postgres redis backend pdf-service
  ```

## 5. Crear admin de prueba

```bash
# Esperar que backend responda
curl http://localhost:8000/docs   # debe retornar HTML

# Registrar admin
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ric.cl","password":"admin123","full_name":"Admin"}'

# Marcarlo como admin
docker exec ric_postgres psql -U ric_user -d ric_conductor \
  -c "UPDATE users SET is_admin = true WHERE email = 'admin@ric.cl' RETURNING email, is_admin;"
```

## 6. Frontend Next.js

```bash
cd frontend
npm install        # 2-5 min
npm run dev        # http://localhost:3000
```

Login con `admin@ric.cl / admin123` debería funcionar.

## 7. Backend tests (opcional, valida que todo está OK)

```bash
cd backend
python -m venv .venv

# Activar venv:
#   Git Bash:        source .venv/Scripts/activate
#   PowerShell:      .venv\Scripts\Activate.ps1
#   cmd:             .venv\Scripts\activate.bat

pip install -r requirements.txt
DATABASE_URL="sqlite+aiosqlite:///:memory:" JWT_SECRET=test ENVIRONMENT=test pytest tests/ -v
# 220 tests deben pasar
```

## 8. Mobile Android (opcional)

```bash
cd frontend
npx cap add android   # genera frontend/android/
NODE_ENV=development npx cap sync android
npx cap open android   # abre Android Studio
```

En Android Studio:
1. Espera Gradle sync (3-10 min primera vez).
2. Crear AVD (Tools → Device Manager → Create Device → Pixel 6 API 34).
3. ▶️ Run.

Para que el emulador llegue al dev server, asegurar que `frontend/android/app/src/main/AndroidManifest.xml` tenga `android:usesCleartextTraffic="true"` en la tag `<application>`.

## 9. Hacer que Claude Code recupere contexto

El archivo `CLAUDE.md` en la raíz del repo es leído automáticamente por Claude Code al abrir el proyecto. **Ya está commiteado y viajará con el clone.**

```bash
# En la nueva máquina, después del clone:
cd calculadora-RIC
claude  # o el comando que use tu instalación

# Claude leerá CLAUDE.md automáticamente y tendrá:
#   - Stack y convenciones
#   - Estructura del proyecto
#   - Variables de entorno
#   - Estado deployment Railway
#   - Bugs activos
#   - Plan de cobro (resumen + link a docs/PRICING.md)
```

## 10. Acceso a Railway desde la nueva máquina

```bash
npm i -g @railway/cli
railway login    # abre browser para autenticación
railway link     # selecciona proyecto "calculadora-RIC"

# Comandos útiles después:
railway status
railway logs
railway run env   # ve variables de entorno
```

## 11. Cuentas/credenciales que necesitas a mano

| Servicio | Para qué |
|---|---|
| GitHub | Push commits, ver Actions |
| Railway | Deploy, logs, variables de entorno producción |
| Google Cloud Console | OAuth credentials (project_id existente) |
| Stripe (futuro) | Cuando implementes cobro |
| Transbank (futuro) | Webpay Plus para Chile |
| Resend / SES (futuro) | Email transaccional |
| Google Play Console (futuro) | Publicación app Android ($25 USD una vez) |

## 12. Workflow típico de trabajo

```bash
# 1. Pull lo último
git pull origin main

# 2. Levantar servicios
docker compose up -d postgres redis backend pdf-service

# 3. Levantar frontend
cd frontend && npm run dev

# 4. Hacer cambios, testear

# 5. Verificar antes de commit
cd backend && pytest tests/ -v
cd ../frontend && npx tsc --noEmit && npm run lint

# 6. Commit y push
git add ...
git commit -m "feat: ..."
git push origin main

# 7. Railway auto-deploy comienza. Monitorear:
railway logs --service calculadora-RIC-backend
# o ver Railway dashboard en navegador
```

## Troubleshooting común

### "Cannot find module 'next'"
```bash
cd frontend && rm -rf node_modules .next && npm install
```

### Backend no levanta — error asyncpg
Probablemente el volumen de Postgres tiene credenciales viejas. Solución:
```bash
docker compose down
docker volume rm codigo_postgres_data
docker compose up -d postgres redis backend
```
(Pierdes data local, pero seeds se re-aplican.)

### CORS error desde frontend
Asegurar que `BACKEND_CORS_ORIGINS` en `.env` (o Railway) incluye tu URL del frontend.

### React error #418 / #423 hidratación
Ya resuelto con `suppressHydrationWarning` en `<html>` y `<body>`. Si vuelve, es porque algún componente nuevo introduce mismatch SSR/cliente.

### Capacitor no sincroniza
```bash
cd frontend
rm -rf android   # cuidado si tienes cambios nativos custom
npx cap add android
NODE_ENV=development npx cap sync android
```

---

**Última verificación**: 2026-05-06. Si pasa tiempo, verificar versiones en `package.json` y `requirements.txt` por si hay cambios.
