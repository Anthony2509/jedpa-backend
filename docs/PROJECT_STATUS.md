# JEDPA 2026 — Backend: estado del proyecto y traspaso

> Documento para retomar el trabajo en un chat nuevo. Se lee junto con `CLAUDE.md` (reglas obligatorias), `docs/SPEC.md` (especificación funcional), `docs/ARCHITECTURE.md` (arquitectura) y `docs/PREGUNTAS-CLIENTE.md` (preguntas abiertas).
> Última actualización: 8 de octubre de 2026 (noche). Rama `develop`, commit `512863d`.

## 0. Resumen

- API **NestJS 11 + TypeORM + PostgreSQL 16**, separada del frontend (repo `jedpa-frontend`, Next.js). Puerto 4000, prefijo `/api`.
- **Sprint 1 terminado:** autenticación JWT, roles, usuarios, catálogos, delegaciones, participantes (alta, edición, búsqueda y filtros) y auditoría inmutable.
- **El esquema completo ya está en la base**, incluidas las tablas de documentos, archivos, ejemplares de credencial y entregas, pero **esas tablas todavía no tienen endpoints**.
- **No existe todavía:** carga y revisión de documentos, cálculo automático del estado, credenciales (PDF y QR), verificación pública, entregas, importación de Excel, reportes ni diplomas.
- Verificado el 8 de octubre: build y lint limpios, 29 tests unitarios y 89 e2e en verde, migraciones y seed correctos, y prueba manual de los endpoints.

## 1. Cómo correrlo

### En la PC del usuario (Windows, Git Bash)

```
docker compose up -d          # PostgreSQL 16 en Docker (necesita Docker Desktop abierto)
npm run migration:run         # crea el esquema
npm run seed                  # roles, catálogos, requisitos y usuarios de desarrollo (idempotente)
npm run start:dev             # API en http://localhost:4000/api
```

- Hace falta un `.env` (está en `.gitignore`). Se parte de `.env.example`; el equipo comparte los valores (`DB_USER=jedpa_user`, `DB_NAME=jedpa_db`, etc.).
- **En la PC del usuario `DB_PORT=5433`**: tiene un PostgreSQL nativo de Windows ocupando el 5432 (responde en español y rechaza a `jedpa_user`). `docker-compose.yml` usa `${DB_PORT}:5432`, así que con 5433 conviven los dos.
- PostgreSQL solo lee usuario y contraseña al crear el volumen. Si se cambian en el `.env`: `docker compose down -v` y `docker compose up -d` (borra los datos).
- Usuarios de desarrollo (los crea el seed fuera de producción), todos con la contraseña `password123`:
  - `admin@jedpa.local` (ADMIN)
  - `coordinador@jedpa.local` (COORDINADOR)
  - `operador@jedpa.local` (OPERADOR)
- Swagger: `http://localhost:4000/docs` (solo fuera de producción). Colección de Yaak en `docs/yaak/` (`npm run yaak:generate`).
- Calidad: `npm run build`, `npm run lint`, `npm test` y `npm run test:e2e`. Las e2e recrean una base `jedpa_test` en el mismo servidor del `.env`.

### Desde un chat en la nube vinculado a la PC

- El shell remoto es Linux y **no ve el Docker ni el `localhost` de Windows**. No correr `npm install` ahí: rompe los binarios de Windows (`bcrypt`).
- Flujo que funcionó:
  1. En la carpeta del usuario, `git archive develop -o node_modules/.cache/develop.tar` (o un `.tgz` sin `node_modules`).
  2. Pasarlo al workspace con `device_stage_files`.
  3. En el workspace: `npm install`; PostgreSQL 16 local con `initdb` en `/var/lib/pgtest` y `pg_ctl` (el binario está en `/usr/lib/postgresql/16/bin`; correrlo como el usuario `postgres`).
  4. Crear un `.env` propio y correr build, tests, migraciones, seed y `node dist/main`.
- PostgreSQL y la API del workspace se caen entre turnos: volver a levantarlos con `pg_ctl ... start` y `setsid nohup node dist/main &`.
- Los cambios se devuelven archivo por archivo con `device_commit_files`. Los commits los hace el usuario.

### Git

- El trabajo está en **`develop`**. `main` solo tiene el esqueleto inicial de Nest.
- Convención: un commit por historia de Jira, `[TIPO] JEDPA-XX descripción`. **Nunca `git push`**: lo revisa y sube el equipo.
- En Windows, `git status` marca casi todo como modificado por los saltos de línea (CRLF). Se arregla con `git config core.autocrlf true`.

## 2. Arquitectura en una página

- Monolito modular: un módulo por carpeta en `src/`. Cada módulo expone su *service*, nunca su repositorio.
- Pipeline de cada petición: `helmet → CORS → ThrottlerGuard → JwtAuthGuard → RolesGuard → ValidationPipe → Controller`. Los guards son globales: **una ruta nueva nace protegida**; las públicas llevan `@Public()`.
- Roles: los nombres viven solo en `src/common/constants/roles.ts` (`ADMIN`, `COORDINADOR`, `OPERADOR`).
- Auditoría: `auditService.record(manager, actor, {...})` **dentro de la misma transacción** que el cambio. La tabla `audit_logs` es de solo inserción: un trigger bloquea `UPDATE`, `DELETE` y `TRUNCATE`.
- Esquema solo por migraciones (`synchronize: false`). Columnas en `snake_case`, UUID como clave y fechas en `timestamptz`.
- Reglas puras del participante en `src/participants/participant-rules.ts`.

### Módulos y tablas

| Módulo / tabla | Entidad | ¿Tiene API? |
|---|---|---|
| `auth` | — | Sí |
| `users`, `roles` | `users`, `roles` | Sí |
| `catalogs/*` | `delivery_places`, `participant_types`, `macro_regions`, `sports`, `document_types`, `document_requirements` | Sí (solo los lugares de entrega se editan) |
| `delegations` | `delegations` | Sí |
| `participants` | `participants` | Sí |
| `audit` | `audit_logs` | Sí (lectura) |
| `health` | — | Sí |
| `documents` | `participant_documents` | **No**: solo la entidad |
| `storage` | `stored_files` | **No**: solo la entidad |
| `credentials` | `credential_copies` (0 = original, 1 a 3 = duplicados; token de QR **por ejemplar**) | **No**: solo la entidad |
| `deliveries` | `deliveries` (una por ejemplar) | **No**: solo la entidad |

## 3. Endpoints

### Convenciones

- Base `/api`. Cabecera `Authorization: Bearer <token>` salvo en las rutas públicas.
- Paginación: `?page=1&limit=20` (máximo 100). Respuesta `{ data, meta: { page, limit, total, totalPages } }`.
- Catálogos: devuelven la **lista completa sin paginar**, solo los activos salvo `?includeInactive=true`.
- Errores: `{ statusCode, message, error, path, timestamp }`. `message` puede ser un texto o un **arreglo** de textos (validación). Unicidad violada → `409`.
- Activar o desactivar: `PATCH /:id/active` con `{ "isActive": boolean }`. No hay borrado físico.
- Las entidades devuelven `id`, `createdAt` y `updatedAt` (ISO) y sus relaciones anidadas completas.

### Tabla de rutas

| Método y ruta | Rol | Notas |
|---|---|---|
| `GET /health` | Pública | `{ status: "ok" }`; `503` si la base no responde |
| `POST /auth/login` | Pública | Body `{ email, password }`. Devuelve `{ accessToken, expiresIn: "8h", user }`. **Máximo 5 intentos por minuto por IP** (`429`). Mismo mensaje para correo inexistente, contraseña errónea o usuario inactivo |
| `GET /auth/me` | Autenticado | `{ id, email, fullName, role }`, con `role` = `"ADMIN"` \| `"COORDINADOR"` \| `"OPERADOR"` |
| `GET /users` | ADMIN | Paginado. Filtros `search`, `roleId`, `isActive`. Nunca devuelve `passwordHash` |
| `GET /users/:id` | ADMIN | `{ id, email, fullName, role: { id, name, description }, isActive, lastLoginAt, createdAt, updatedAt }` |
| `POST /users` | ADMIN | `{ email, fullName, password, roleId }`. Contraseña de 12 a 72 caracteres, con al menos una letra y un número |
| `PATCH /users/:id` | ADMIN | Campos opcionales; la contraseña solo cambia si se envía. Nadie cambia su propio rol |
| `PATCH /users/:id/active` | ADMIN | Nadie se desactiva a sí mismo; no se puede desactivar al último ADMIN activo |
| `GET /roles` | ADMIN | Los 3 roles (para el selector de usuarios) |
| `GET /participant-types` | Autenticado | `{ code, name, category: "REGULAR"\|"SPECIAL", accessLevel: "TOTAL"\|"PARTIAL"\|null }` |
| `GET /macro-regions` | Autenticado | `M1` a `M8` (`name`: "Macrorregión N"; `headquarters`: `null`, pendiente P12) |
| `GET /sports` | Autenticado | 10 disciplinas con abreviatura (`AJD`, `ATL`…) |
| `GET /document-types` | Autenticado | 11 tipos (`RESOLUCION_DIRECTORAL`, `DNI`, `FOTO`…), con `isSensitive` |
| `GET /document-requirements` | Autenticado | `?participantTypeId=`. **Solo contiene los obligatorios** (ver §5) |
| `GET /delivery-places`, `GET /delivery-places/:id` | Autenticado | Los 11 lugares del cliente |
| `POST /delivery-places`, `PATCH /delivery-places/:id`, `PATCH /delivery-places/:id/active` | ADMIN | `{ name }` |
| `GET /delegations` | Autenticado | Paginado. Filtros `search` (el código **contiene** el texto), `macroRegionId`, `sportId`, `category`, `gender` (`D`\|`V`), `isActive` |
| `GET /delegations/:id` | Autenticado | Con `macroRegion` y `sport` |
| `POST /delegations`, `PATCH /delegations/:id` | ADMIN, COORDINADOR | `{ macroRegionId, sportId, category, gender }`. **El código se genera**: `M1-AJD-B-D`. Única por macro, disciplina, categoría y género |
| `PATCH /delegations/:id/active` | ADMIN | |
| `GET /participants` | Autenticado | Paginado, ordenado por apellidos. Filtros `search` (documento, nombres, apellidos o colegio; sin tildes; cada palabra debe coincidir), `status`, `participantTypeId`, `delegationId`, `macroRegionId`, `isActive` |
| `GET /participants/:id` | Autenticado | Con `participantType` y `delegation` (con `macroRegion` y `sport`). **Sin documentos, ejemplares ni entregas** |
| `POST /participants` | Regulares: los 3 roles. Especiales: ADMIN y COORDINADOR | Ver el body abajo |
| `PATCH /participants/:id` | Igual que el alta | Edita datos, **no el estado**. Enviar `null` vacía un campo opcional. Cambiar a un tipo de otra categoría reinicia el estado; está prohibido si la credencial ya se imprimió |
| `PATCH /participants/:id/active` | ADMIN | |
| `GET /audit-logs` | ADMIN | Paginado, del más reciente al más antiguo. Filtros `participantId`, `userId`, `action`, `entity`, `entityId`, `from`, `to` (fecha `AAAA-MM-DD` en hora de Perú) |

### Body de `POST /participants`

| Campo | Regla |
|---|---|
| `documentType` | `"DNI"` \| `"CE"` \| `"PASAPORTE"` |
| `documentNumber` | Texto. DNI: 8 dígitos (conserva los ceros). CE o pasaporte: 6 a 12 alfanuméricos. Único junto con el tipo (`409`) |
| `firstNames`, `paternalLastName` | Obligatorios |
| `maternalLastName` | Opcional |
| `participantTypeId` | UUID de `/participant-types` |
| **Regulares** | `delegationId` (UUID de una delegación activa), `gender` (`"FEMALE"`\|`"MALE"`) y `birthDate` (`AAAA-MM-DD`) **obligatorios** |
| **Especiales** | `institution` obligatorio; **no** llevan `delegationId` |
| Opcionales | `schoolName`, `schoolModularCode`, `ugel`, `region`, `province`, `district`, `phone`, `email`, `disabilityType`, `disabilityClass`, `externalId`, `externalDelegateId`, `extraData` (objeto JSON) |

Estado inicial: `PENDING_DOCUMENTS` para los regulares y `READY_TO_PRINT` para los especiales.

### Ejemplo de respuesta de un participante (resumida)

```json
{
  "id": "49c6…", "documentType": "DNI", "documentNumber": "01234567",
  "firstNames": "Ana", "paternalLastName": "Pérez", "maternalLastName": null,
  "gender": "FEMALE", "birthDate": "2010-05-01",
  "participantTypeId": "84b6…",
  "participantType": { "code": "DEPORTISTA", "name": "Deportista", "category": "REGULAR", "accessLevel": null },
  "delegationId": "b16b…",
  "delegation": { "code": "M1-AJD-B-D", "category": "B", "gender": "D",
    "macroRegion": { "code": "M1", "name": "Macrorregión 1" },
    "sport": { "code": "AJD", "name": "Ajedrez" } },
  "institution": null, "schoolName": null, "region": null,
  "status": "PENDING_DOCUMENTS", "isActive": true,
  "createdAt": "2026-10-09T01:04:08.330Z", "updatedAt": "…"
}
```

### Ejemplo de registro de auditoría

```json
{ "id": "…", "userId": "…", "user": { "id": "…", "fullName": "Administrador", "email": "admin@jedpa.local" },
  "action": "CREATE", "entity": "Participant", "entityId": "…", "participantId": "…",
  "changes": { "firstNames": { "old": null, "new": "Ana" } }, "ip": "::1", "createdAt": "…" }
```

Acciones (`audit_action`): `CREATE`, `UPDATE`, `IMPORT`, `ACTIVATE`, `DEACTIVATE`, `STATUS_CHANGE`, `DOCUMENT_REVIEW`, `PRINT`, `REPRINT`, `DELIVER` y `DIPLOMA_PRINT`. Hoy solo se generan las cinco primeras.

## 4. Qué funciona (verificado el 8 de octubre)

- `npm run build` y `npm run lint` sin errores.
- `npm test`: 29 tests unitarios (reglas del participante, guard de roles, filtro de excepciones, auditoría, naming).
- `npm run test:e2e`: 89 tests (autenticación, participantes y **matriz de permisos** de cada ruta por rol).
- Migraciones y seed sobre una base vacía.
- Prueba manual:
  - El login devuelve el token; el sexto intento en un minuto devuelve `429`.
  - El operador recibe `403` en `/users` y `/audit-logs`.
  - Se creó la delegación `M1-AJD-B-D` (la categoría se normaliza a mayúscula) y un deportista; sin fecha de nacimiento ni género, el alta responde `400` con los dos mensajes.
  - La búsqueda `perez` encuentra "Pérez".
  - El alta queda en la auditoría con el usuario y los cambios.

## 5. Qué hay que solucionar

Ordenado por impacto.

1. **Límite de peticiones por IP.** El login admite 5 intentos por minuto **por IP** y el resto de la API 100 peticiones por minuto **por IP**. En una sede de entrega, varios operadores detrás del mismo router comparten la IP: se bloquearían entre ellos (el frontend hace varias peticiones por pantalla). Propuesta:
   - limitar por usuario autenticado (tracker propio del `ThrottlerGuard`) y subir el límite general;
   - para el login, limitar por correo + IP.
2. **`trust proxy` no está configurado.** Detrás de un proxy o balanceador (deploy), `req.ip` será la IP del proxy: la auditoría registrará una IP equivocada y el límite de peticiones se compartirá entre todos. Configurarlo en `main.ts` al definir el deploy.
3. **El estado del participante no avanza.** Hasta que exista el módulo de documentos, los regulares quedan siempre en `PENDING_DOCUMENTS`.
4. **Los documentos opcionales no existen en el backend.** `document_requirements` tiene la columna `is_required`, pero el seed solo carga los obligatorios. El frontend muestra opcionales por tipo (por ejemplo, el certificado de discapacidad para el deportista). Hay que sembrarlos con `is_required = false`.
5. **Nivel de acceso.** En el backend es un dato **del tipo** (MINEDU queda en `null`). El frontend deja **elegirlo por participante** en las credenciales especiales y asume MINEDU = total. Hay que decidir una regla (pregunta P7).
6. **Paso "Emitida" y token del QR.** El frontend separa "Generar" (asigna código y QR) de "Imprimir". El backend no tiene ese estado y crea el token **por ejemplar** al imprimir, mientras que el supuesto 4 del frontend dice que el QR no cambia con los duplicados. Hay que acordar un solo modelo antes de construir el módulo de credenciales. Lo más simple: token por participante, creado al generar, y `PRINT`/`REPRINT` por ejemplar.
7. **Alta de delegaciones por el operador.** El backend solo deja crear delegaciones al ADMIN y al COORDINADOR. En el frontend, cualquier rol registra un integrante escribiendo macro, disciplina, categoría y género; si la delegación no existe, un operador no podría darlo de alta. Opciones: permitir al operador crearla o resolverla con "buscar o crear" dentro del alta del participante.
8. **No hay búsqueda exacta de delegación por código.** El frontend navega por código (`/delegations/M1-AJD-B-D`), pero el backend solo tiene `GET /delegations/:id` y `?search=` (que busca "contiene"). Agregar `?code=` exacto o `GET /delegations/by-code/:code`.
9. **Faltan endpoints de resumen.** El frontend calcula colas, contadores, avance por delegación y por macro y reportes **con la lista completa** de participantes. Con unas 6.600 personas y paginación de hasta 100, eso no escala. Hacen falta:
   - conteos por estado y por cola (para el menú y el dashboard);
   - un filtro de cola en `GET /participants` (por ejemplo, `?queue=review`: tiene documentos subidos sin revisar, algo que `status` no puede expresar);
   - el resumen por delegación (integrantes, pendientes, listos, por entregar y entregados);
   - el avance por macro.
10. **Auditoría frente a lo que muestra el frontend.**
    - No trae el nombre del participante, solo `participantId`. La pantalla de auditoría y "Actividad reciente" muestran el nombre: hay que unirlo en la consulta.
    - No hay acción para "documento subido" (solo `DOCUMENT_REVIEW`).
    - `GET /audit-logs` es solo para ADMIN, pero el frontend muestra a **los tres roles** el historial de la ficha y la "Actividad reciente" del dashboard. Hace falta un endpoint de historial por participante (por ejemplo, `GET /participants/:id/history`) abierto a los roles que gestionan participantes, o mostrar esas secciones solo al ADMIN.
11. **La ficha del participante necesita más datos.** `GET /participants/:id` no trae documentos, ejemplares ni entregas. Con esos módulos hará falta una respuesta compuesta, o endpoints `GET /participants/:id/documents` y `/credential-copies`.
12. **`package-lock.json` desincronizado.** `npm ci` falla (faltan `@emnapi/core` y `@emnapi/runtime`). Correr `npm install` y hacer commit del lockfile.
13. **El README es la plantilla de Nest.** Reemplazarlo por un resumen de este documento.
14. **El token va en el body del login.** Hay que decidir cómo lo guarda el frontend. Recomendado: en memoria más `sessionStorage`, o pasar a una cookie `httpOnly` emitida por el backend. No hay refresh token: a las 8 horas hay que volver a iniciar sesión, y el frontend debe manejar el `401`.
15. Menores:
    - no hay endpoint para que un usuario cambie su propia contraseña;
    - `changes` de la auditoría guarda datos personales (DNI, fecha de nacimiento); es aceptable porque solo lo ve el ADMIN, pero hay que tenerlo en cuenta para la política de datos (P10).

## 6. Qué falta construir (siguientes sprints)

| Módulo | Endpoints previstos | Notas |
|---|---|---|
| Storage (Cloudinary privado) | interno | `type: authenticated`, URLs firmadas cortas, validación por *magic bytes*, 5 MB (SUPUESTO) |
| Documentos y revisión | subir, aprobar, observar (con motivo), ver archivo (URL firmada) | Recalcula el estado del participante en la misma transacción (`EligibilityService`) y se audita como `DOCUMENT_REVIEW` |
| Resoluciones directorales | subir una por macro y **vincularla** a cada participante que figura | Un solo `stored_file` para muchos `participant_documents` |
| Credenciales | generar, imprimir por lotes, duplicado con motivo (máximo 3), PDF de 120 × 155 mm con calibración X/Y por plantilla | `pdfkit` + `qrcode`; se audita `PRINT`/`REPRINT` |
| Verificación pública | `GET /verify/:token` (`@Public`) | Respuesta mínima: nombre, tipo, delegación y habilitado o no (P5) |
| Entregas | registrar la entrega de un ejemplar (lugar y observación) | Solo si el ejemplar está impreso; se audita `DELIVER` |
| Importación de Excel | vista previa (errores por fila) y confirmación | Descartar siempre `USUARIO` y `PASSWORD` |
| Reportes | nivel 1 (ADMIN, COORDINADOR) y completo con exportación Excel por *streaming* (ADMIN) | |
| Diplomas | por definir (P8) | Fuera del plan original |

## 7. Qué está listo para conectar con el frontend

| Pantalla del frontend | Endpoints listos | Qué falta |
|---|---|---|
| `/login` | `POST /auth/login`, `GET /auth/me` | Guardar el token, proteger las rutas y manejar el `401` (frontend) |
| `/administration/users` | `GET/POST/PATCH /users`, `PATCH /users/:id/active`, `GET /roles` | El formulario del frontend no pide contraseña |
| `/administration/delivery-places` | `GET/POST/PATCH /delivery-places`, `PATCH /delivery-places/:id/active` | Nada: se puede conectar tal cual |
| `/audit` | `GET /audit-logs` | Nombre del participante (§5, punto 10) y equivalencia de acciones |
| `/participants` (consulta) | `GET /participants` con búsqueda y filtros | La columna "Pendiente" depende de documentos |
| `/special-credentials` | `POST /participants` con un tipo especial; `GET /participants?participantTypeId=` | Nivel de acceso (§5, punto 5) |
| Alta de integrante (`/registration`) | `POST /participants`, `GET /delegations` | Fecha de nacimiento, género y apellido materno en el formulario; resolver la delegación (§5, punto 7) |
| `/delegations` | `GET /delegations` | Resumen por delegación (§5, punto 9) |
| Selectores de formularios | `/participant-types`, `/macro-regions`, `/sports`, `/document-types`, `/delivery-places` | Nada |
| `/review`, `/credentials`, `/deliveries`, `/resolutions`, `/reports`, `/verify/[code]`, dashboard | — | Módulos sin construir (§6) y endpoints de resumen |

## 8. Próximos pasos recomendados

1. Hacer commit del lockfile y reemplazar el README.
2. Resolver con el equipo del frontend los puntos 5, 6 y 7 de §5: definen el contrato.
3. Agregar los endpoints de resumen y la búsqueda de delegación por código (§5, puntos 8 y 9).
4. Ajustar el límite de peticiones y `trust proxy` (§5, puntos 1 y 2) antes de cualquier prueba con varios usuarios.
5. Sprint 2: storage, documentos y revisión, y el recálculo del estado. Es lo que desbloquea las colas de registro y revisión del frontend.
