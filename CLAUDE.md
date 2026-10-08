# CLAUDE.md — jedpa-backend

## 1. Proyecto

Plataforma administrativa de credenciales para los **Juegos Escolares Deportivos y Paradeportivos (JEDPA)**.

Flujo: registro de participantes → carga y revisión de documentos → validación de requisitos → impresión de credencial con QR → entrega física → reportes.

Se maneja información de **menores de edad**: la seguridad es prioridad en cada decisión.

## 2. Stack

NestJS · TypeScript · TypeORM · PostgreSQL 16 (Docker, `docker-compose.yml`) · JWT · Swagger. Puerto por defecto: 4000.

## 3. Convenciones

- Código, carpetas y endpoints en **inglés**; mensajes de error y descripciones (Swagger, validaciones) en **español**.
- Prefijo global `/api`. Swagger en `/docs` (solo fuera de producción).
- Un módulo por carpeta en `src/` (`src/users`, `src/participants`, ...). Lo transversal va en `src/common`; la configuración, en `src/config`.
- DTOs con `class-validator` / `class-transformer`. El `ValidationPipe` global usa `whitelist`, `forbidNonWhitelisted` y `transform`.
- Respuestas paginadas: `{ data, meta: { page, limit, total, totalPages } }`. Usa `PaginationQueryDto` y `buildPaginatedResponse` de `src/common/pagination`.
- Clave primaria UUID; fechas en `timestamptz`.
- Errores con forma uniforme: `{ statusCode, message, error, path, timestamp }` (filtro global en `src/common/filters`).

## 4. Reglas de seguridad

- Contraseñas con bcrypt. **Nunca** devolver `passwordHash` (ni en respuestas ni en relaciones).
- Todas las rutas protegidas por JWT, salvo las marcadas con `@Public()`.
- Sin borrado físico en entidades de negocio: usar `isActive`.
- No registrar datos personales en logs (DNI, nombres, teléfonos, fechas de nacimiento, documentos).
- Nunca subir `.env` al repositorio. Toda variable nueva se añade a `.env.example` (sin valores secretos). Las que usa la app se validan con Joi en `src/config/env.validation.ts`; las que usan solo los scripts (p. ej. `SEED_ADMIN_*` del seed) se validan dentro del propio script.

## 5. Auditoría

Toda alta, edición, importación, desactivación o cambio de estado se registra en la tabla de auditoría.
La tabla es **solo inserción** (sin update ni delete) y **nunca** guarda contraseñas ni hashes.

## 6. Roles

Los roles son datos de la tabla `roles`. Solo **ADMIN** es un rol fijo del sistema.
REVISOR, IMPRESION y ENTREGA son **PROVISIONALES** hasta que el cliente los confirme. Sus nombres viven únicamente en `src/common/constants/roles.ts`: nunca escribas el nombre de un rol como texto suelto en otro archivo.

## 7. Estados del participante

Nombres exactos: `PENDING_DOCUMENTS`, `IN_REVIEW`, `OBSERVED`, `READY_TO_PRINT`, `PRINTED`, `DELIVERED`.
`PRINTED` y `DELIVERED` son estados distintos: **imprimir nunca marca la entrega**.

## 8. Forma de trabajo

- Al terminar cada tarea ejecuta `npm run build` y `npm run lint` y corrige los errores.
- Resume los archivos creados o modificados y explica cómo probar.
- **No** hagas `git commit` ni `git push`.
- No instales dependencias innecesarias ni inventes funcionalidades fuera de lo pedido.
- Detente al final de cada tarea y espera confirmación.

Especificación funcional: `docs/SPEC.md`. Arquitectura: `docs/ARCHITECTURE.md`.
