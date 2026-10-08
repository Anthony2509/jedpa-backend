# Arquitectura — jedpa-backend

Flujo de negocio: **Registrar → cargar documentos → validar → habilitar impresión → generar/imprimir credencial → entregar → reportar**.
Todo queda auditado y se manejan datos de menores de edad.

## 1. Estilo: monolito modular

Un solo servicio NestJS, dividido en módulos por capacidad de negocio con fronteras claras.

- **Por qué no microservicios:** un equipo, un cliente, un dominio acotado y un evento con fecha fija. Los microservicios añaden red, despliegues y consistencia eventual sin aportar valor aquí.
- **Por qué modular:** cada módulo expone solo su *service* (nunca su repositorio) y los demás dependen de esa interfaz. Si en el futuro algo necesita escalar por separado (p. ej. la generación masiva de PDFs), se extrae sin reescribir.

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
├── delivery-places/  participant-types/   # catálogos
├── participants/            # CRUD + importación Excel + máquina de estados
├── audit/                   # AuditService (solo inserción) + GET /audit-logs
│   ── Sprint 2 ──
├── documents/               # carga y revisión de documentos
├── storage/                 # abstracción de almacenamiento de archivos
├── credentials/             # emisión, QR, impresión, reimpresiones
│   ── Sprint 3 ──
├── deliveries/              # entrega física
└── reports/                 # reportes y exportación Excel
```

## 4. Seguridad (pipeline de cada petición)

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

## 5. Persistencia

- `synchronize: false` siempre: el esquema evoluciona **solo con migraciones** versionadas.
- `BaseEntity` común: `id` uuid, `createdAt`/`updatedAt` en `timestamptz`.
- Unicidad garantizada **en la base de datos** (p. ej. `UNIQUE(dni)`), no solo en el código. El filtro traduce `23505` a `409`.
- `extraData` en `jsonb` para las columnas del Excel aún no definidas. Cuando el cliente las confirme, se promueven a columnas reales mediante una migración.
- Índices desde el inicio en: `participants(dni)`, `participants(status)`, `participants(participant_type_id)` y `audit_logs(entity, entity_id)`, `audit_logs(created_at)`.

## 6. Auditoría

- `AuditService.record(entry, manager)` se llama **dentro de la misma transacción** que el cambio: si la operación falla, no queda registro huérfano, y viceversa.
- Se descarta un interceptor genérico: no conoce el estado anterior ni el resultado real del caso de uso.
- Campos: `userId`, `action` (`CREATE`, `UPDATE`, `IMPORT`, `ACTIVATE`, `DEACTIVATE`, `STATUS_CHANGE`, `PRINT`, `REPRINT`, `DELIVER`), `entity`, `entityId`, `changes` (jsonb con antes/después), `ip`, `createdAt`.
- Se eliminan de `changes` las claves sensibles (`password`, `passwordHash`, tokens).
- **Solo inserción, reforzado en la base de datos:** un *trigger* que rechaza `UPDATE` y `DELETE` sobre `audit_logs`, creado en su migración. Así ni un bug ni un acceso directo pueden alterarla.

## 7. Máquina de estados del participante

```
PENDING_DOCUMENTS → IN_REVIEW ⇄ OBSERVED
                    IN_REVIEW → READY_TO_PRINT → PRINTED → DELIVERED
```

- Las transiciones permitidas están en un mapa único (`participant-status.ts`) con `assertTransition(from, to)`. Toda transición inválida devuelve `409`.
- El `status` **no** se edita por el CRUD: solo cambia mediante casos de uso dedicados (revisar, imprimir, entregar), cada uno auditado como `STATUS_CHANGE`.
- **PRINTED ≠ DELIVERED:** la entrega es una entidad propia (`deliveries`: lugar, fecha y hora, usuario responsable, quién recibe) creada solo por el rol ENTREGA o ADMIN.

## 8. Credenciales y QR (Sprint 2)

- Entidad `credentials`: código único, `issuedAt`, `printedAt`, contador de reimpresiones con motivo obligatorio (auditado).
- El QR contiene un **token opaco aleatorio** (o una URL de verificación con ese token), **nunca** el DNI ni datos personales. La verificación devuelve el mínimo indispensable.
- La impresión masiva genera los PDF en el servidor por lotes.

## 9. Documentos y almacenamiento (Sprint 2)

- Módulo `storage` con una interfaz (`StorageService`) y una implementación intercambiable (Cloudinary, S3 o disco local). Los módulos de negocio no conocen el proveedor.
- Los documentos de menores (certificado médico, seguro, foto) son **privados**: entrega autenticada con URLs firmadas de corta duración. Nunca URLs públicas permanentes.
- Validación de tipo real del archivo (magic bytes, no solo la extensión) y tamaño máximo.

## 10. Importación y reportes Excel

- **Importación en dos fases:** (1) *preview* que valida cada fila y devuelve los errores por fila, sin persistir; (2) *commit* en una transacción. Se audita como `IMPORT`, con totales.
- **Exportación** por *streaming* para no cargar miles de filas en memoria.

## 11. Calidad

- **Unit tests:** máquina de estados, reglas de los services y el filtro de excepciones.
- **e2e:** contra un Postgres de prueba en Docker, cubriendo la **matriz de permisos** de `docs/SPEC.md` (cada ruta × cada rol). Es la red de seguridad más valiosa del proyecto.
- `npm run build` y `npm run lint` limpios en cada tarea. CI (GitHub Actions) con build, lint y tests cuando el repo lo requiera.
