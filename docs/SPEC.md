# Especificación funcional — JEDPA 2026

Sistema de credenciales de los Juegos Escolares Deportivos y Paradeportivos.
Fuentes: *Plan de Desarrollo JEDPA 2026 v1.0* (07/10/2026), *Respuestas a preguntas del cliente* (08/10/2026) y el Excel de referencia *Control de IMPRESIÓN de documentos* (edición anterior; los datos no están actualizados).

> **CONFIRMADO**: lo respondió el cliente por escrito. **SUPUESTO**: decisión del equipo pendiente de validar. Las preguntas abiertas están en `docs/PREGUNTAS-CLIENTE.md`.

## 1. Flujo

Registro/importación → carga documental → revisión y validación → habilitación de impresión → impresión de credencial con QR → confirmación de entrega → reportes y exportación Excel.

"Impresa" y "entregada" son estados separados: **imprimir nunca marca la entrega**.

## 2. Roles — CONFIRMADO

| Rol (código) | Nombre del cliente | Alcance |
|---|---|---|
| `ADMIN` | Administrador | Todo, incluidos usuarios, catálogos, reportería completa y auditoría. |
| `COORDINADOR` | Coordinador | Participantes y credenciales especiales, diplomas, reportería básica. |
| `OPERADOR` | Operador | Participantes regulares (documentos, revisión, impresión) y diplomas. |

Matriz del cliente:

| Capacidad | ADMIN | COORDINADOR | OPERADOR |
|---|:-:|:-:|:-:|
| Todo sobre participantes regulares (Deportista, Acompañante, Delegado, Entrenador): subir documentos, revisarlos, aprobarlos e imprimir credenciales | ✔ | ✔ | ✔ |
| Credenciales especiales (MINEDU, Invitado, Proveedor acceso total y parcial): cargar datos y emitir | ✔ | ✔ | — |
| Diplomas: seleccionar participante e imprimir sus datos en el diploma preimpreso | ✔ | ✔ | ✔ |
| Reportería nivel 1 (avance básico) | ✔ | ✔ | — |
| Reportería completa y auditoría (quién modificó qué) | ✔ | — | — |

**SUPUESTOS** (el cliente no los menciona): la gestión de usuarios y catálogos es solo de ADMIN; registrar entregas lo pueden hacer los tres roles; activar o desactivar participantes es solo de ADMIN; la importación Excel la hacen ADMIN y COORDINADOR.

## 3. Tipos de participante — CONFIRMADO

Coinciden con los tipos de credencial que se imprimen.

| Código | Nombre | Categoría | Acceso en credencial | Requisitos documentales |
|---|---|---|---|---|
| `DEPORTISTA` | Deportista | Regular | por confirmar | Resolución Directoral, DNI, Certificado médico, Seguro, Foto |
| `ACOMPANANTE` | Acompañante | Regular | por confirmar | Deportista que no cumple algún documento obligatorio (ver pregunta P1) |
| `DELEGADO` | Delegado | Regular | por confirmar | Resolución Directoral, DNI, Foto |
| `ENTRENADOR` | Entrenador | Regular | por confirmar | Resolución Directoral, DNI |
| `MINEDU` | MINEDU | Especial | por confirmar | Ninguno: se crea e imprime directamente |
| `INVITADO` | Invitado | Especial | Parcial (según arte) | Ninguno |
| `PROVEEDOR_TOTAL` | Proveedor acceso total | Especial | Total | Ninguno |
| `PROVEEDOR_PARCIAL` | Proveedor acceso parcial | Especial | Parcial | Ninguno |

- Los requisitos se modelan como **datos** (tabla `document_requirements`: tipo de participante × tipo de documento × obligatorio), no como código. Así un cambio del cliente no requiere desplegar.
- **Paradeportista** no es un tipo propio: es un Deportista con discapacidad (tipo y clase de discapacidad en su ficha). Ver P3.

## 4. Documentos — CONFIRMADO (catálogo)

| Código | Documento | Notas |
|---|---|---|
| `RESOLUCION_DIRECTORAL` | Resolución Directoral | Un PDF por macrorregión (8 en total, 8–10 páginas). Se sube una vez y se **vincula** al perfil de cada participante que figura en ella. Vincularlo equivale a confirmar que está inscrito y apto. |
| `DOCUMENTO_DESIGNACION` | Documento de designación (docente) | |
| `DNI` | Documento de identidad | |
| `CERTIFICADO_MEDICO` | Certificado médico | Dato de salud: sensible. |
| `CERTIFICADO_DISCAPACIDAD` | Certificado de discapacidad | Dato de salud: sensible. |
| `SEGURO` | Seguro | |
| `AUTORIZACION_NOTARIAL` | Autorización notarial | |
| `RESPONSABILIDAD_PARTICIPACION` | Anexo 2: responsabilidad de participación | |
| `AUTORIZACION_USO_IMAGEN` | Anexo 3: autorización de uso de imagen | |
| `DDJJ_ENTRENADOR_DELEGADO` | Anexo 6: declaración jurada entrenador-delegado | |
| `FOTO` | Foto | También se imprime en la credencial. |

**Estado por documento** (plan §3): `PENDING`, `APPROVED`, `OBSERVED`, `NOT_APPLICABLE`, con observación, revisor y fecha. Equivalencias para importar el Excel: PENDIENTE → `PENDING`; IMPRESO, APROBADA y VALIDADO E IMPRESO → `APPROVED`; OBSERVADO u OBSERVADA → `OBSERVED`; NO APLICA → `NOT_APPLICABLE`.

Formatos y tamaños máximos de archivo: **SUPUESTO**, PDF/JPG/PNG de hasta 5 MB (foto: JPG/PNG).

## 5. Organización deportiva — CONFIRMADO

- **Macrorregión:** 8 (`M1`…`M8`). Cada una tiene una sede (p. ej. M1 → San Martín) y una Resolución Directoral.
- **Disciplina:** nombre y abreviatura (AJD Ajedrez, ATL Atletismo, BSQ Básquet, FTB Fútbol, FTS Futsal, HAN Handball, JUD Judo, NAT Natación, TNM Tenis de mesa, VOL Vóley, PAT por confirmar…).
- **Categoría:** A, B, C, D, E.
- **Delegación:** representa a una macrorregión en una disciplina, categoría y género. Tiene entre 3 y 22 integrantes (participantes, entrenador y delegado). Su código se **genera**: `{macro}-{disciplina}-{categoría}-{género}`, p. ej. `M1-AJD-B-D` (D = damas, V = varones). Es único.
- Cada participante regular pertenece a **una** delegación. Los especiales no tienen delegación.

## 6. Participante

| Campo | Obligatorio | Reglas / origen en el Excel |
|---|---|---|
| `id` (UUID) | auto | |
| `documentType` | sí | `DNI`, `CE` o `PASAPORTE` (la credencial dice "DNI / CE / Pas."). |
| `documentNumber` | sí | DNI: `^\d{8}$` (conserva los ceros a la izquierda; es texto). CE y pasaporte: `^[A-Za-z0-9]{6,12}$` (SUPUESTO). Único junto con `documentType`. |
| `firstNames` | sí | NOMBRES |
| `paternalLastName` | sí | APELLIDO PATERNO |
| `maternalLastName` | no | APELLIDO MATERNO |
| `gender` | regular: sí | `FEMENINO` / `MASCULINO` |
| `birthDate` | regular: sí | FECHA DE NACIMIENTO |
| `participantTypeId` | sí | CONDICIÓN (ver tabla de equivalencias, P2) |
| `delegationId` | regulares: sí | DELEGACIÓN |
| `institution` | especiales: sí | "Servicio / Institución" impreso en la credencial especial |
| `schoolName`, `schoolModularCode` | no | I.E., COD_MOD |
| `ugel`, `region`, `province`, `district` | no | UGEL, REGIÓN, PROVINCIA, DISTRITO |
| `phone`, `email` | no | CELULAR, CORREO ELECTRÓNICO |
| `disabilityType`, `disabilityClass` | no | TIPO / CLASE DE DISCAPACIDAD (paradeportistas) |
| `externalId`, `externalDelegateId` | no | ID PERSONAL / ID DE SU DELEGADO en el sistema Mateus (trazabilidad de la importación) |
| `extraData` (jsonb) | no | PRUEBA 1–4 y MARCA 1–4, y columnas futuras sin campo propio |
| `status` | auto | §7 |
| `isActive` | auto | |

**Nunca se importan ni se guardan** las columnas `USUARIO` y `PASSWORD` del Excel: son credenciales de otro sistema (ver §11).

## 7. Estados del participante

`PENDING_DOCUMENTS` → `IN_REVIEW` ⇄ `OBSERVED` → `READY_TO_PRINT` → `PRINTED` → `DELIVERED`

| Estado | Regla operativa (plan §4) |
|---|---|
| `PENDING_DOCUMENTS` | Faltan requisitos obligatorios; impresión bloqueada. |
| `IN_REVIEW` | Documentos recibidos, pendientes de evaluación. |
| `OBSERVED` | Al menos un requisito obligatorio está observado. |
| `READY_TO_PRINT` | Todos los requisitos obligatorios están aprobados; se habilita "Imprimir". |
| `PRINTED` | Se registró la impresión; no implica entrega. |
| `DELIVERED` | Un usuario confirmó la entrega (lugar, fecha y hora, responsable). |

- El estado documental (`PENDING_DOCUMENTS`, `IN_REVIEW`, `OBSERVED`, `READY_TO_PRINT`) se **recalcula** a partir de los documentos y los requisitos de su tipo, no se edita a mano.
- Los tipos especiales nacen directamente en `READY_TO_PRINT`.
- Si un participante ya impreso o entregado recibe una observación, la impresión de duplicados se vuelve a bloquear. Ver P6.

## 8. Credenciales, impresión y QR

- **Soporte:** papel mate de 200 g, preimpreso por una imprenta y ya cortado a **120 × 155 mm**. El sistema **solo imprime los datos variables** sobre el arte: nombres y apellidos, documento, institución o delegación, foto y, en el reverso, el QR.
- Se genera un **PDF a medida exacta** (120 × 155 mm, página 1 anverso y página 2 reverso con QR), con una plantilla por tipo de participante.
- **Calibración obligatoria:** las muestras del cliente muestran texto impreso dos veces y desalineado. La plantilla tendrá desplazamientos X/Y configurables y una "hoja de prueba" antes de imprimir en lote.
- **Original + hasta 3 duplicados** (CONFIRMADO): cada ejemplar (`copyNumber` de 0 a 3) registra su propia impresión (fecha, usuario y motivo si es duplicado) y su propia entrega. Un duplicado no se emite sin motivo.
- **QR:** contiene una URL de verificación con un **token aleatorio**, sin DNI ni datos personales. Al escanearlo muestra el **estado de la documentación** (CONFIRMADO). Qué ve un usuario sin sesión iniciada está por definir (P5). Nunca expone archivos.
- Los artes 2026 aún no se han entregado.

## 9. Entrega física — CONFIRMADO

- Acción explícita "Credencial entregada", disponible solo si el ejemplar está impreso.
- Formulario: lugar de entrega (catálogo) y observación. La fecha, la hora y el usuario se registran automáticamente.
- Se registra por cada ejemplar: original, duplicado 1, 2 y 3.
- Lugares iniciales (catálogo editable por ADMIN):
  1. Local Bros, Magdalena
  2. IEE Melitón Carvajal, Lince
  3. Villa Panamericana, VES
  4. Sede competencia – Videna, San Luis
  5. Sede competencia – IE Ricardo Palma, Surquillo
  6. Sede competencia – Polideportivo Luisa Fuentes, VES
  7. Sede competencia – Complejo Andrés Avelino Cáceres, VMT
  8. Sede competencia – Complejo Panamericano, San Miguel
  9. Sede competencia – CAR, Punta Rocas
  10. Sede competencia – Universidad de Lima, Ate
  11. Sede competencia – Coliseo FIA, La Molina

## 10. Reportes y exportación

- **Nivel 1** (ADMIN, COORDINADOR): avance por macrorregión y delegación, con "docs. pendientes", "listas para imprimir", "impresas", "entregadas" y "en stock" (impresas no entregadas), como en las hojas *ResumenDocs x Delegación*, *Resumen EntregaCredenciales* y *Avance* del Excel.
- **Completo** (ADMIN): consolidado por participante, con identificación, delegación, estado de cada documento, habilitación, impresiones y entregas por ejemplar (lugar, fecha y hora, responsable, observación). Exportable a Excel con los filtros aplicados.
- **Auditoría** (ADMIN): filtros por participante, usuario, fecha y tipo de acción. Cada registro guarda el campo afectado, el valor anterior y el nuevo.

## 11. Seguridad y datos personales

- Se tratan datos de **menores** y **datos de salud** (certificado médico y de discapacidad), que son sensibles según la Ley 29733 de protección de datos personales.
- Los archivos se guardan en **Cloudinary** (exigido por el plan) con entrega **privada** (`type: authenticated`) y URLs firmadas de corta duración. Nunca URLs públicas.
- **El Excel del cliente contiene usuarios y contraseñas en texto plano** de unos 2.700 participantes (columnas `USUARIO` y `PASSWORD`, hoja *ID GENERAL*). El importador descarta esas columnas y nunca las registra en logs ni en la auditoría. Se recomienda al cliente no seguir circulando ese archivo y cambiar esas contraseñas (P9).

## 12. Fuera del alcance del plan original

El plan v1.0 no incluye lo siguiente, que el cliente pidió en sus respuestas. Debe acordarse el impacto en el cronograma de 4 semanas:

1. **Diplomas:** impresión de datos sobre un diploma preimpreso.
2. **Hasta 3 duplicados** con entrega independiente por ejemplar.
3. **Credenciales especiales:** cuatro tipos sin documentos, con permiso propio.
4. **Delegaciones y macrorregiones** con código generado.

## 13. Contrato de la API — Sprint 1

Convenciones:

- Base: `/api`, con `Authorization: Bearer <token>` salvo en las rutas *Públicas*.
- Paginación: `?page=1&limit=20` (máximo 100) → `{ data, meta: { page, limit, total, totalPages } }`.
- Errores: `{ statusCode, message, error, path, timestamp }`.
- Activar o desactivar: `PATCH /:id/active` con `{ "isActive": boolean }`.

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/health` | Pública |
| POST | `/api/auth/login` | Pública (límite estricto de intentos) |
| GET | `/api/auth/me` | Autenticado |
| GET · POST · PATCH | `/api/users`, `/api/users/:id`, `/api/users/:id/active` | ADMIN |
| GET | `/api/roles` | ADMIN |
| GET | `/api/delivery-places`, `/api/delivery-places/:id`, `/api/participant-types`, `/api/macro-regions`, `/api/sports`, `/api/document-types`, `/api/document-requirements?participantTypeId=` | Autenticado |
| POST · PATCH | `/api/delivery-places`, `/api/delivery-places/:id`, `/api/delivery-places/:id/active` | ADMIN |
| GET | `/api/delegations`, `/api/delegations/:id` | Autenticado |
| POST · PATCH | `/api/delegations`, `/api/delegations/:id` | ADMIN, COORDINADOR |
| GET | `/api/participants` (filtros: `search`, `status`, `participantTypeId`, `delegationId`, `macroRegionId`, `isActive`), `/api/participants/:id` | Autenticado |
| POST · PATCH | `/api/participants`, `/api/participants/:id` | Tipos regulares: ADMIN, COORDINADOR, OPERADOR · tipos especiales: ADMIN, COORDINADOR |
| PATCH | `/api/participants/:id/active` | ADMIN |
| GET | `/api/audit-logs` (filtros: `participantId`, `userId`, `action`, `from`, `to`) | ADMIN |

Los catálogos devuelven la **lista completa** (sin paginar, pensada para selectores), solo los activos salvo `?includeInactive=true`. En el Sprint 1 solo los lugares de entrega se editan desde la API; los demás se cargan con el seed y su edición llega con el motor de reglas (S2-05).

Sprints siguientes: importación Excel (preview y commit), documentos y revisión, credenciales (PDF, QR, duplicados), entregas, diplomas, reportes y exportación.
