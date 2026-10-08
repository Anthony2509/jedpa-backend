# Arquitectura — jedpa-backend

Flujo de negocio: **Registrar → cargar documentos → validar → habilitar impresión → generar/imprimir credencial → entregar → reportar**.
Todo queda auditado y se manejan datos de menores de edad.

## 1. Estilo: monolito modular

Un solo servicio NestJS, dividido en módulos por capacidad de negocio con fronteras claras.

- **Por qué no microservicios:** un equipo, un cliente, un dominio acotado y un evento con fecha fija. Los microservicios añaden red, despliegues y consistencia eventual sin aportar valor aquí.
- **Por qué modular:** cada módulo expone solo su *service* (nunca su repositorio) y los demás dependen de esa interfaz. Si en el futuro algo necesita escalar por separado (p. ej. la generación masiva de PDFs para ~6.600 credenciales), se extrae sin reescribir.

## 2. Capas dentro de cada módulo

```
Controller  →  Service  →  Repository (TypeORM)  →  PostgreSQL
 HTTP, DTOs,    reglas de negocio,     consultas
 Swagger,       transacciones,
 roles          auditoría
```

- **Controller:** fino. Valida la entrada (DTO), declara permisos (`@Roles`, `@Public`) y delega en el service. No contiene lógica.
- **Service:** dueño de las reglas y de las transacciones. Un caso de uso que escribe en varias tablas (participante + auditoría) usa **una sola transacción**.
- **Repository:** `Repository<Entity>` de TypeORM inyectado. Las consultas complejas (reportes) se aíslan en métodos o en clases `*.queries.ts` del módulo.
- **Dominio explícito solo donde hay complejidad real:** la máquina de estados del participante vive en un archivo propio y puro (sin Nest ni TypeORM), fácil de testear. No se aplica arquitectura hexagonal completa ni CQRS: sería sobreingeniería para este tamaño.

## 3. Estructura de carpetas

```
src/
├── main.ts                  # bootstrap: prefijo /api, helmet, CORS, ValidationPipe, Swagger
├── app.module.ts            # Config, TypeORM, Throttler, guards y filtro globales
├── config/                  # validación Joi del entorno, fábrica de TypeORM
├── common/                  # transversal, sin lógica de negocio
│   ├── constants/roles.ts   # ÚNICA fuente de nombres de rol
│   ├── decorators/          # @Public, @Roles, @CurrentUser
│   ├── filters/             # AllExceptionsFilter (forma uniforme + 23505 → 409)
│   ├── guards/              # JwtAuthGuard, RolesGuard
│   └── pagination/          # PaginationQueryDto, buildPaginatedResponse
├── database/
│   ├── base.entity.ts       # id uuid, createdAt/updatedAt timestamptz
│   ├── data-source.ts       # para la CLI de migraciones
│   ├── migrations/
│   └── seeds/               # roles, admin inicial, catálogos provisionales
├── health/                  # GET /api/health
├── auth/                    # login, estrategia JWT, /me
├── users/  roles/
├── catalogs/                # módulos de catálogo administrables por ADMIN:
│   ├── delivery-places/     #   lugares de entrega
│   ├── participant-types/   #   8 tipos (regular/especial, nivel de acceso)
│   ├── macro-regions/       #   M1…M8
│   ├── sports/              #   disciplinas y abreviaturas (AJD, ATL…)
│   └── document-types/      #   tipos de documento + document_requirements
├── delegations/             # delegaciones con código generado M1-AJD-B-D
├── participants/            # CRUD, máquina de estados, importación Excel
├── audit/                   # AuditService (solo inserción) + GET /audit-logs
│   ── Núcleo documental ──
├── storage/                 # StorageService → implementación Cloudinary (privada)
├── documents/               # carga, revisión y recálculo de habilitación
│   ── Credenciales ──
├── credentials/             # ejemplares (original + 3 duplicados), PDF, QR
├── verification/            # GET público /verify/:token (respuesta mínima)
├── deliveries/              # entrega física por ejemplar
├── diplomas/                # impresión de datos sobre el diploma preimpreso
│   ── Cierre ──
└── reports/                 # nivel 1, completo y exportación Excel
```

## 4. Modelo de datos

```
macro_regions ─┐        sports ─┐
               └─< delegations >─┘          code UNIQUE  (M1-AJD-B-D)
                        │
participant_types ─< participants >─────────── document_type + document_number UNIQUE
        │                 │   │
        │                 │   └─< credential_copies  (copy_number 0..3, UNIQUE por participante)
        │                 │            ├─ printed_at / printed_by / reason
        │                 │            └─< deliveries (delivery_place, delivered_at/by, observation)
        │                 └─< participant_documents  (UNIQUE participant + document_type)
        │                          └── file_id ─> files  (Cloudinary, privado)
        └─< document_requirements >── document_types
users >── roles                    audit_logs (solo inserción)
```

- **`document_requirements`** (tipo de participante × tipo de documento × obligatorio) es la fuente de verdad de la habilitación. Si el cliente cambia una regla, se cambia un dato, no el código.
- **`files` separado de `participant_documents`:** la Resolución Directoral se sube **una vez por macrorregión** y se **vincula** a cada participante (varios `participant_documents` apuntan al mismo `file`). No se duplican archivos de 8–10 páginas en miles de perfiles.
- **`credential_copies`:** el original y cada duplicado son filas independientes, cada una con su impresión y su entrega. El estado `PRINTED`/`DELIVERED` del participante refleja el último ejemplar. El límite de 3 duplicados lo garantiza un `CHECK (copy_number BETWEEN 0 AND 3)`.
- **Habilitación calculada:** `EligibilityService.recalculate(participantId)` se ejecuta en la misma transacción tras cada cambio de documento. Compara los documentos con `document_requirements` y fija el estado documental. Los tipos especiales no tienen requisitos y quedan en `READY_TO_PRINT`.

## 5. Seguridad (pipeline de cada petición)

```
helmet → CORS → ThrottlerGuard → JwtAuthGuard → RolesGuard → ValidationPipe → Controller
                                      │ salta si @Public()
```

- **Autenticación:** JWT Bearer (8 h). `JwtStrategy` recarga al usuario en cada petición y rechaza si `isActive = false`: desactivar un usuario corta su acceso de inmediato, sin esperar a que caduque el token.
- **Autorización:** `RolesGuard` compara contra `ROLES` de `src/common/constants/roles.ts`. Los guards se registran como `APP_GUARD`, así que una ruta nueva nace **protegida por defecto**.
- **Login:** límite más estricto (p. ej. 5 intentos por minuto por IP) y el mismo mensaje genérico para "usuario no existe" y "contraseña incorrecta".
- **Contraseñas:** bcrypt (coste 12). `passwordHash` con `select: false` en la entidad, de modo que nunca sale por accidente.
- **Datos personales:** nada de PII en logs. El filtro global no expone detalles de PostgreSQL (incluyen valores como el DNI).
- **Swagger** desactivado en producción. `.env` nunca se versiona.

## 6. Persistencia

- `synchronize: false` siempre: el esquema evoluciona **solo con migraciones** versionadas.
- `BaseEntity` común: `id` uuid, `createdAt`/`updatedAt` en `timestamptz`.
- Unicidad garantizada **en la base de datos** (p. ej. `UNIQUE(dni)`), no solo en el código. El filtro traduce `23505` a `409`.
- `extraData` en `jsonb` para las columnas del Excel aún no definidas. Cuando el cliente las confirme, se promueven a columnas reales mediante una migración.
- Índices desde el inicio en: `participants(document_type, document_number)` (único), `participants(status)`, `participants(participant_type_id)`, `participants(delegation_id)`, `participant_documents(participant_id)`, `credential_copies(participant_id)` y `audit_logs(entity, entity_id)`, `audit_logs(created_at)`.

## 7. Auditoría

- `AuditService.record(entry, manager)` se llama **dentro de la misma transacción** que el cambio: si la operación falla, no queda registro huérfano, y viceversa.
- Se descarta un interceptor genérico: no conoce el estado anterior ni el resultado real del caso de uso.
- Campos: `userId`, `action` (`CREATE`, `UPDATE`, `IMPORT`, `ACTIVATE`, `DEACTIVATE`, `STATUS_CHANGE`, `PRINT`, `REPRINT`, `DELIVER`), `entity`, `entityId`, `changes` (jsonb con antes/después), `ip`, `createdAt`.
- Se eliminan de `changes` las claves sensibles (`password`, `passwordHash`, tokens).
- **Solo inserción, reforzado en la base de datos:** un *trigger* que rechaza `UPDATE` y `DELETE` sobre `audit_logs`, creado en su migración. Así ni un bug ni un acceso directo pueden alterarla.

## 8. Máquina de estados del participante

```
PENDING_DOCUMENTS → IN_REVIEW ⇄ OBSERVED
                    IN_REVIEW → READY_TO_PRINT → PRINTED → DELIVERED
```

- Las transiciones permitidas están en un mapa único (`participant-status.ts`) con `assertTransition(from, to)`. Toda transición inválida devuelve `409`.
- El `status` **no** se edita por el CRUD: solo cambia mediante casos de uso dedicados (revisar, imprimir, entregar), cada uno auditado como `STATUS_CHANGE`.
- **PRINTED ≠ DELIVERED:** la entrega es una entidad propia (`deliveries`: lugar, fecha y hora, usuario responsable, quién recibe) creada solo por el rol ENTREGA o ADMIN.

## 9. Credenciales, impresión y QR

- **Soporte:** cartulina preimpresa de 120 × 155 mm. El sistema genera un **PDF a medida exacta** con solo los datos variables (nombre, documento, institución o delegación, foto) en el anverso y el QR en el reverso. Una plantilla por tipo de participante, con coordenadas en mm.
- **Calibración:** desplazamiento X/Y configurable por plantilla y una hoja de prueba. Las muestras del cliente se ven impresas dos veces y desalineadas, así que es un riesgo real.
- **Impresión por lotes:** se seleccionan los participantes `READY_TO_PRINT` y se genera un solo PDF. Cada ejemplar impreso queda registrado (`PRINT` o `REPRINT` con motivo) en la misma transacción.
- **QR:** URL `/verify/:token`, con un token aleatorio de 128 bits por participante, revocable. La respuesta pública es mínima (nombre, tipo, delegación, habilitado o no) y el detalle documental solo se ve con sesión. Nunca se exponen archivos ni el número de documento.
- **Generación:** PDF y QR en el servidor (p. ej. `pdfkit` + `qrcode`), sin servicios externos.

## 10. Documentos y almacenamiento

- Módulo `storage` con una interfaz (`StorageService`) cuya implementación es **Cloudinary** (exigido por el plan). Los módulos de negocio no conocen al proveedor, así que se puede cambiar si el cliente lo pide por protección de datos (ver P10).
- Subida con `type: 'authenticated'` (nunca `upload`, que es público) y lectura mediante URLs firmadas con expiración corta, generadas solo tras validar permisos.
- Los documentos de menores (certificado médico, seguro, foto) son **privados**: entrega autenticada con URLs firmadas de corta duración. Nunca URLs públicas permanentes.
- Validación de tipo real del archivo (magic bytes, no solo la extensión) y tamaño máximo.

## 11. Importación y reportes Excel

- **Origen:** la hoja *LISTA LIMPIA* (sistema Mateus). Hay un mapeo explícito columna → campo (ver SPEC §6). Las columnas `USUARIO` y `PASSWORD` **se descartan al leer**: nunca llegan a la base, a los logs ni a la auditoría.
- **Importación en dos fases:** (1) *preview* que valida cada fila y devuelve los errores por fila, sin persistir; (2) *commit* en una transacción. Se audita como `IMPORT`, con totales.
- **Exportación** por *streaming* para no cargar miles de filas en memoria.

## 12. Calidad

- **Unit tests:** máquina de estados, reglas de los services y el filtro de excepciones.
- **e2e:** contra un Postgres de prueba en Docker, cubriendo la **matriz de permisos** de `docs/SPEC.md` (cada ruta × cada rol). Es la red de seguridad más valiosa del proyecto.
- `npm run build` y `npm run lint` limpios en cada tarea. CI (GitHub Actions) con build, lint y tests cuando el repo lo requiera.
