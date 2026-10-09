# JEDPA · Backend

API del sistema de credenciales de los **Juegos Escolares Deportivos y Paradeportivos**: registro de participantes, carga y revisión de documentos, validación de requisitos, impresión de credenciales con QR, verificación pública, importación del padrón y auditoría completa.

**Stack:** NestJS 11 · TypeScript · TypeORM · PostgreSQL 16 · JWT · Cloudinary (archivos privados) · Swagger.

| Documento | Contenido |
|---|---|
| [`docs/SPEC.md`](docs/SPEC.md) | Especificación funcional, roles, reglas y contrato de la API |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitectura, modelo de datos y decisiones |
| [`docs/PREGUNTAS-CLIENTE.md`](docs/PREGUNTAS-CLIENTE.md) | Consultas pendientes con el cliente |
| [`docs/yaak/`](docs/yaak) | Colección de Yaak con todos los endpoints (`npm run yaak:generate`) |
| [`CLAUDE.md`](CLAUDE.md) | Convenciones y reglas de trabajo del equipo |

## Requisitos

- Node.js **24** y npm **11.19+** (`npm install -g npm@11`)
- Docker (PostgreSQL de desarrollo y pruebas e2e)

## Puesta en marcha local

```bash
cp .env.example .env          # completar DB_USER, DB_PASSWORD y JWT_SECRET
docker compose up -d          # PostgreSQL 16
npm install
npm run migration:run         # crea o actualiza el esquema
npm run seed                  # roles, catálogos y usuarios de desarrollo
npm run start:dev             # http://localhost:4000/api · Swagger en /docs
```

Usuarios de desarrollo (contraseña `password123`): `admin@jedpa.local`, `coordinador@jedpa.local` y `operador@jedpa.local`.

Para volver a empezar de cero: `docker compose down -v`, luego `docker compose up -d`, `npm run migration:run` y `npm run seed`.

## Scripts

| Script | Uso |
|---|---|
| `start:dev` / `start:prod` | API en desarrollo (recarga automática) / compilada |
| `build` · `typecheck` · `lint` | Compilación, tipos (incluye pruebas) y estilo |
| `test` · `test:e2e` | Unitarias · e2e sobre una base aparte `jedpa_test` (requiere Docker) |
| `migration:generate -- src/database/migrations/Nombre` | Nueva migración a partir de las entidades |
| `migration:run` · `migration:revert` · `migration:show` | Migraciones en desarrollo |
| `seed` | Datos iniciales (idempotente) |
| `release` | Producción: migraciones + seed sobre el código compilado |
| `yaak:generate` | Regenera la colección de Yaak |

Antes de cada commit: `npm run typecheck && npm run lint && npm test && npm run test:e2e`.

## Despliegue en Railway

El repositorio incluye `Dockerfile` (multi-etapa, Node 24, usuario sin privilegios) y `railway.json`:
- Antes de cada despliegue ejecuta `npm run release`: aplica las migraciones pendientes y el seed.
- Comprueba la salud del servicio con `GET /api/health`.

1. En Railway, crea un proyecto con un servicio **PostgreSQL** y un servicio desde este repositorio (rama `main` o `develop`).
2. En el servicio del backend, define las variables:

| Variable | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al servicio de base de datos) |
| `JWT_SECRET` | 48+ caracteres aleatorios (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `JWT_EXPIRES_IN` | `8h` |
| `FRONTEND_URL` | URL pública del frontend (CORS), p. ej. `https://jedpa.up.railway.app` |
| `VERIFY_PUBLIC_URL` | `<FRONTEND_URL>/verificar` (página que abre el QR) |
| `STORAGE_DRIVER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` · `CLOUDINARY_API_KEY` · `CLOUDINARY_API_SECRET` | Credenciales con permiso de escritura |
| `CLOUDINARY_FOLDER` | `jedpa` (producción) |
| `SEED_ADMIN_EMAIL` · `SEED_ADMIN_PASSWORD` | Administrador inicial (12+ caracteres, letras y números). Solo hacen falta en el primer despliegue |
| `SWAGGER_ENABLED` | `true` solo si se quiere `/docs` en producción (p. ej. durante QA) |

`PORT` lo asigna Railway. En producción la app confía en el proxy (`trust proxy`) para registrar la IP real en la auditoría.

3. Despliega y verifica `https://<dominio-del-backend>/api/health` → `{"status":"ok"}`.

En producción **no** se crean usuarios de desarrollo: el primer acceso es con `SEED_ADMIN_EMAIL`. Después se crean los demás usuarios desde la API.
