# Especificación funcional — Sprint 1 (S1-03)

Sistema de credenciales JEDPA. Este documento fija el alcance funcional del Sprint 1 y el contrato de la API para el equipo frontend.

> Lo marcado como **PROVISIONAL** o **SUPUESTO** está pendiente de confirmación del cliente y puede cambiar.

## 1. Roles (PROVISIONALES)

Solo `ADMIN` es un rol fijo del sistema. Los demás son **provisionales, pendientes de confirmación del cliente**; sus nombres viven en `src/common/constants/roles.ts`.

| Rol | Descripción | Alcance |
|---|---|---|
| `ADMIN` | Administra todo: usuarios, catálogos y auditoría. | Sprint 1 |
| `REVISOR` | Alta y edición de participantes. En el Sprint 2 revisará documentos. | Sprint 1 (participantes) · Sprint 2 (documentos) |
| `IMPRESION` | Emitirá e imprimirá credenciales. | Sprint 2 |
| `ENTREGA` | Confirmará la entrega física de credenciales. | Sprint 3 |

En el Sprint 1, `IMPRESION` y `ENTREGA` solo tienen los permisos de lectura comunes a cualquier usuario autenticado.

## 2. Matriz de permisos — Sprint 1

| Recurso | Lectura | Crear / editar | Activar / desactivar |
|---|---|---|---|
| Autenticación | Todos | — | — |
| Usuarios | ADMIN | ADMIN | ADMIN |
| Roles | ADMIN | — (datos semilla) | — |
| Lugares de entrega | Cualquier autenticado | ADMIN | ADMIN |
| Tipos de participante | Cualquier autenticado | ADMIN | ADMIN |
| Participantes | Cualquier autenticado | ADMIN, REVISOR | ADMIN |
| Auditoría | ADMIN | — (solo inserción interna) | — |

No hay borrado físico: "eliminar" equivale a desactivar (`isActive = false`).

## 3. Participante

| Campo | Tipo | Obligatorio | Reglas |
|---|---|---|---|
| `id` | UUID | auto | Clave primaria. |
| `dni` | string | sí | Exactamente 8 dígitos numéricos (`^\d{8}$`). Único. *(SUPUESTO)* |
| `firstName` | string | sí | Nombres. |
| `lastName` | string | sí | Apellidos. |
| `schoolName` | string | sí | Institución educativa. |
| `participantTypeId` | UUID | sí | Debe existir y estar activo en tipos de participante. |
| `birthDate` | date | no | Fecha de nacimiento (`YYYY-MM-DD`). |
| `phone` | string | no | Teléfono de contacto. |
| `extraData` | JSON | no | Absorbe columnas del Excel del cliente que aún no tienen campo propio. |
| `status` | enum | auto | Estado del flujo (ver §4). Inicial: `PENDING_DOCUMENTS`. No se edita por el CRUD. |
| `isActive` | boolean | auto | `true` al crear. Solo ADMIN lo cambia. |
| `createdAt` / `updatedAt` | timestamptz | auto | — |

Un DNI duplicado responde `409 Conflict` con un mensaje en español.

## 4. Estados del participante

`PENDING_DOCUMENTS` → `IN_REVIEW` → (`OBSERVED` ↺) → `READY_TO_PRINT` → `PRINTED` → `DELIVERED`

- En el Sprint 1 todo participante nace en `PENDING_DOCUMENTS`. Las transiciones se implementan en los sprints 2 y 3.
- `PRINTED` y `DELIVERED` son estados distintos: **imprimir nunca marca la entrega**.

## 5. Supuestos a validar con el cliente

1. El DNI tiene exactamente 8 dígitos numéricos. Falta definir el tratamiento de carnés de extranjería o pasaportes.
2. Tipos de participante iniciales (provisionales): **Alumno**, **Entrenador**, **Paradeportista**.
3. Lugares de entrega iniciales: **Colegio**, **Melitón Carvajal / IPD**, **Sede de competencia**.
4. Formatos, tamaños y reglas de documentos (certificado médico, seguro, foto, etc.): **aún sin definir**. Fuera del Sprint 1.
5. Columnas definitivas del Excel de participantes: pendientes (mientras tanto se usa `extraData`).
6. Roles `REVISOR`, `IMPRESION` y `ENTREGA`: nombres y responsabilidades por confirmar.

## 6. Contrato de la API — Sprint 1

Convenciones:

- Base: `/api`. Autenticación: `Authorization: Bearer <token>`, salvo en las rutas marcadas como *Pública*.
- Listados paginados: `?page=1&limit=20` (máximo 100) → `{ data, meta: { page, limit, total, totalPages } }`.
- Errores: `{ statusCode, message, error, path, timestamp }`.
- Activar o desactivar: `PATCH /:id/active` con el cuerpo `{ "isActive": boolean }`.
- La documentación interactiva está en `/docs` (fuera de producción).

### Sistema y autenticación

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/health` | Pública | Estado del servicio y de la BD → `{ status: 'ok' }`. |
| POST | `/api/auth/login` | Pública | `{ email, password }` → `{ accessToken, user }`. |
| GET | `/api/auth/me` | Autenticado | Perfil del usuario actual con su rol. |

### Usuarios y roles

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/users` | ADMIN | Listado paginado. |
| GET | `/api/users/:id` | ADMIN | Detalle. |
| POST | `/api/users` | ADMIN | Crear `{ email, fullName, password, roleId }`. |
| PATCH | `/api/users/:id` | ADMIN | Editar datos y rol. |
| PATCH | `/api/users/:id/active` | ADMIN | Activar o desactivar. |
| GET | `/api/roles` | ADMIN | Listar roles. |

### Catálogos

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/delivery-places` | Autenticado | Listado paginado. |
| GET | `/api/delivery-places/:id` | Autenticado | Detalle. |
| POST | `/api/delivery-places` | ADMIN | Crear. |
| PATCH | `/api/delivery-places/:id` | ADMIN | Editar. |
| PATCH | `/api/delivery-places/:id/active` | ADMIN | Activar o desactivar. |
| GET | `/api/participant-types` | Autenticado | Listado paginado. |
| GET | `/api/participant-types/:id` | Autenticado | Detalle. |
| POST | `/api/participant-types` | ADMIN | Crear. |
| PATCH | `/api/participant-types/:id` | ADMIN | Editar. |
| PATCH | `/api/participant-types/:id/active` | ADMIN | Activar o desactivar. |

### Participantes

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/participants` | Autenticado | Listado paginado. Filtros: `search` (DNI o nombre), `status`, `participantTypeId`, `isActive`. |
| GET | `/api/participants/:id` | Autenticado | Detalle. |
| POST | `/api/participants` | ADMIN, REVISOR | Crear (estado inicial `PENDING_DOCUMENTS`). |
| PATCH | `/api/participants/:id` | ADMIN, REVISOR | Editar datos (no el `status`). |
| PATCH | `/api/participants/:id/active` | ADMIN | Activar o desactivar. |

### Auditoría

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/audit-logs` | ADMIN | Listado paginado. Filtros: `entity`, `entityId`, `action`, `userId`, `from`, `to`. |

Cada operación de escritura de este contrato genera un registro de auditoría con: usuario, acción, entidad, id de la entidad, cambios (sin contraseñas ni hashes) y fecha.
