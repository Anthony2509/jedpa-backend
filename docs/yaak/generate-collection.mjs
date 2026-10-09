/**
 * Genera docs/yaak/jedpa-api.yaak.json: colección de la API JEDPA para importar en Yaak.
 * Uso: node docs/yaak/generate-collection.mjs
 *
 * - Workspace con autenticación Bearer heredada por todas las peticiones; el token
 *   se toma de la respuesta de "Login" y se renueva solo al caducar (TTL 7 h).
 * - Entornos Admin / Coordinador / Operador: cambian el usuario del login.
 * - Los IDs de catálogos se resuelven solos (GET seguros); los de registros creados
 *   salen de la última respuesta de "Crear ..." y nunca disparan altas por su cuenta.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), 'jedpa-api.yaak.json');
const WS = 'wk_JedpaApi01';

// ── Plantillas ────────────────────────────────────────────────────
const v = (name) => `\${[ ${name} ]}`;
/** Valor de una respuesta. behavior: 'smart' (envía si no hay respuesta) o null (solo lee). */
const fromResponse = (requestId, path, behavior = 'smart') =>
  `\${[ response.body.path(request='${requestId}',${behavior ? ` behavior='${behavior}',` : ''} path='${path}') ]}`;
const byCode = (requestId, code) =>
  fromResponse(requestId, `$[?(@.code=="${code}")].id`);
const randomDigits = (digits) =>
  `\${[ random.range(min='${10 ** (digits - 1)}', max='${10 ** digits - 1}', decimals='0') ]}`;

const ID = {
  login: 'rq_JdpLogin01',
  roles: 'rq_JdpRoles01',
  createUser: 'rq_JdpUserC01',
  types: 'rq_JdpPTypes1',
  macros: 'rq_JdpMacros1',
  sports: 'rq_JdpSports1',
  createPlace: 'rq_JdpPlaceC1',
  findDelegation: 'rq_JdpDelegF1',
  createParticipant: 'rq_JdpPartC01',
  createSpecial: 'rq_JdpPartS01',
};

const TOKEN = `\${[ response.body.path(request='${ID.login}', behavior='ttl', ttl='25200', path='$.accessToken') ]}`;

/**
 * JSON del cuerpo con las etiquetas ${[ ... ]} intactas: Yaak las resuelve antes de
 * enviar, así que sus comillas internas (filtros JSONPath) no deben escaparse.
 */
const jsonWithTemplates = (body) =>
  JSON.stringify(body, null, 2).replace(/\$\{\[ .*? \]\}/g, (tag) =>
    tag.replace(/\\"/g, '"'),
  );

// ── Constructores ─────────────────────────────────────────────────
const folders = [];
const requests = [];
let folderSeq = 0;
let requestSeq = 0;

function folder(name, description, build) {
  const id = `fl_JdpFold${String(++folderSeq).padStart(2, '0')}`;
  folders.push({
    model: 'folder',
    id,
    workspaceId: WS,
    folderId: null,
    name,
    description,
    sortPriority: folderSeq * 1000,
    headers: [],
    authentication: {},
    authenticationType: null,
  });
  let order = 0;
  build((r) => requests.push(request({ ...r, folderId: id, sortPriority: ++order })));
}

function request({
  id,
  folderId,
  sortPriority,
  name,
  method = 'GET',
  path,
  query = [],
  body,
  upload = false,
  description = '',
  auth = 'inherit',
}) {
  return {
    model: 'http_request',
    id: id ?? `rq_JdpReq${String(++requestSeq).padStart(4, '0')}`,
    workspaceId: WS,
    folderId,
    name,
    description,
    method,
    url: `${v('baseUrl')}${path}`,
    urlParameters: query.map(([name, value, enabled = true]) => ({ name, value, enabled })),
    headers: body ? [{ name: 'Content-Type', value: 'application/json', enabled: true }] : [],
    // multipart: Yaak añade el Content-Type con su boundary; el archivo se elige en Body → file.
    bodyType: upload ? 'multipart/form-data' : body ? 'application/json' : null,
    body: upload
      ? { form: [{ enabled: true, name: 'file', file: '', contentType: null }] }
      : body
        ? { text: jsonWithTemplates(body) }
        : {},
    // null = hereda el Bearer del workspace; 'none' = sin autenticación.
    authenticationType: auth === 'none' ? 'none' : null,
    authentication: {},
    sortPriority,
  };
}

// ── Colección ─────────────────────────────────────────────────────
folder('00 · Sistema', 'Estado del servicio.', (add) => {
  add({ name: 'Health', path: '/health', auth: 'none', description: 'Público. Ejecuta `SELECT 1` en la BD. Esperado: **200** `{ "status": "ok" }`.' });
});

folder('01 · Autenticación', 'El token de **Login** lo usan todas las peticiones (heredado del workspace).', (add) => {
  add({
    id: ID.login,
    name: 'Login',
    method: 'POST',
    path: '/auth/login',
    auth: 'none',
    body: { email: v('email'), password: v('password') },
    description:
      'Inicia sesión con el usuario del **entorno activo** (Admin / Coordinador / Operador).\n\n' +
      '⚠️ Al cambiar de entorno, **vuelve a ejecutar Login** para usar ese rol.\n\n' +
      'Esperado: **200** con `accessToken` y `user`. Máximo 5 intentos por minuto (luego 429).',
  });
  add({ name: 'Mi perfil', path: '/auth/me', description: 'Usuario autenticado y su rol. Esperado: **200**.' });
});

folder('02 · Usuarios y roles (ADMIN)', 'Solo ADMIN. Otros roles reciben **403**.', (add) => {
  add({ id: ID.roles, name: 'Listar roles', path: '/roles', description: 'ADMIN, COORDINADOR y OPERADOR.' });
  add({
    name: 'Listar usuarios',
    path: '/users',
    query: [['page', '1'], ['limit', '20'], ['search', '', false], ['isActive', 'true', false], ['roleId', '', false]],
    description: 'Paginado. Activa los filtros opcionales en la pestaña de parámetros.',
  });
  add({
    id: ID.createUser,
    name: 'Crear usuario',
    method: 'POST',
    path: '/users',
    body: {
      email: `usuario${randomDigits(5)}@jedpa.local`,
      fullName: 'Usuario de prueba',
      password: 'ClaveSegura2026',
      roleId: fromResponse(ID.roles, '$[?(@.name=="OPERADOR")].id'),
    },
    description:
      'Crea un OPERADOR con correo aleatorio. Contraseña: mínimo 12 caracteres con letras y números.\n\nEsperado: **201** (nunca devuelve `passwordHash`).',
  });
  const createdUser = fromResponse(ID.createUser, '$.id', null);
  add({ name: 'Ver usuario creado', path: `/users/${createdUser}`, description: 'Usa el id de la última respuesta de **Crear usuario**.' });
  add({
    name: 'Editar usuario creado',
    method: 'PATCH',
    path: `/users/${createdUser}`,
    body: { fullName: 'Usuario de prueba (editado)' },
    description: 'Queda auditado con el valor anterior y el nuevo.',
  });
  add({ name: 'Desactivar usuario creado', method: 'PATCH', path: `/users/${createdUser}/active`, body: { isActive: false }, description: 'Su sesión deja de funcionar al instante.' });
  add({ name: 'Reactivar usuario creado', method: 'PATCH', path: `/users/${createdUser}/active`, body: { isActive: true } });
});

folder('03 · Catálogos', 'Lectura: cualquier usuario autenticado. Escritura (lugares de entrega): solo ADMIN.', (add) => {
  add({ id: ID.types, name: 'Tipos de participante', path: '/participant-types', query: [['includeInactive', 'true', false]], description: '8 tipos: 4 REGULAR y 4 SPECIAL.' });
  add({ id: ID.macros, name: 'Macrorregiones', path: '/macro-regions', description: 'M1 … M8.' });
  add({ id: ID.sports, name: 'Disciplinas', path: '/sports', description: 'Abreviaturas usadas en el código de delegación.' });
  add({ name: 'Tipos de documento', path: '/document-types' });
  add({
    name: 'Requisitos del Deportista',
    path: '/document-requirements',
    query: [['participantTypeId', byCode(ID.types, 'DEPORTISTA')]],
    description: 'Documentos obligatorios por tipo. Quita el filtro para ver todos.',
  });
  add({ name: 'Lugares de entrega', path: '/delivery-places', query: [['includeInactive', 'true', false]], description: 'Los 11 lugares confirmados por el cliente.' });
  add({
    id: ID.createPlace,
    name: 'Crear lugar de entrega',
    method: 'POST',
    path: '/delivery-places',
    body: { name: `Sede de prueba ${randomDigits(4)}` },
    description: 'Solo ADMIN. Nombre único sin distinguir mayúsculas (409 si se repite).',
  });
  const createdPlace = fromResponse(ID.createPlace, '$.id', null);
  add({ name: 'Renombrar lugar creado', method: 'PATCH', path: `/delivery-places/${createdPlace}`, body: { name: `Sede de prueba editada ${randomDigits(4)}` } });
  add({ name: 'Desactivar lugar creado', method: 'PATCH', path: `/delivery-places/${createdPlace}/active`, body: { isActive: false } });
});

folder('04 · Delegaciones', 'Lectura: cualquiera. Crear/editar: ADMIN y COORDINADOR. El código M1-AJD-B-D se genera solo.', (add) => {
  add({
    name: 'Crear delegación M1-AJD-B-D',
    method: 'POST',
    path: '/delegations',
    body: { macroRegionId: byCode(ID.macros, 'M1'), sportId: byCode(ID.sports, 'AJD'), category: 'B', gender: 'D' },
    description: 'M1 · Ajedrez · categoría B · Damas. La segunda vez responde **409** (ya existe): es lo esperado.',
  });
  add({
    name: 'Listar delegaciones',
    path: '/delegations',
    query: [['page', '1'], ['limit', '20'], ['search', 'M1', false], ['category', 'B', false], ['gender', 'D', false]],
  });
  add({
    id: ID.findDelegation,
    name: 'Buscar M1-AJD-B-D',
    path: '/delegations',
    query: [['search', 'M1-AJD-B-D']],
    description: 'Los participantes de este workspace usan esta delegación.',
  });
});

folder('05 · Participantes', 'Lectura: cualquiera. Crear/editar regulares: los 3 roles. Especiales: ADMIN y COORDINADOR. Activar/desactivar: ADMIN.', (add) => {
  const delegationId = fromResponse(ID.findDelegation, '$.data[0].id');
  add({
    id: ID.createParticipant,
    name: 'Crear deportista',
    method: 'POST',
    path: '/participants',
    body: {
      documentType: 'DNI',
      documentNumber: randomDigits(8),
      firstNames: 'Juan Carlos',
      paternalLastName: 'Pérez',
      maternalLastName: 'Quispe',
      gender: 'MALE',
      birthDate: '2012-05-20',
      participantTypeId: byCode(ID.types, 'DEPORTISTA'),
      delegationId,
      schoolName: 'IE San Martín de Porres',
      phone: '987654321',
      extraData: { prueba1: 'Ajedrez rápido' },
    },
    description: 'DNI aleatorio. Requiere haber creado la delegación M1-AJD-B-D (carpeta 04). Esperado: **201** en `PENDING_DOCUMENTS`.',
  });
  add({
    id: ID.createSpecial,
    name: 'Crear invitado (especial)',
    method: 'POST',
    path: '/participants',
    body: {
      documentType: 'PASAPORTE',
      documentNumber: `AB${randomDigits(6)}`,
      firstNames: 'Ana',
      paternalLastName: 'Ruiz',
      participantTypeId: byCode(ID.types, 'INVITADO'),
      institution: 'DRE Ucayali',
    },
    description: 'Especiales: sin delegación, institución obligatoria, nacen en `READY_TO_PRINT`. Con el entorno **Operador** responde **403**.',
  });
  add({
    name: 'Listar participantes',
    path: '/participants',
    query: [
      ['page', '1'],
      ['limit', '20'],
      ['search', 'perez juan', false],
      ['status', 'PENDING_DOCUMENTS', false],
      ['participantTypeId', byCode(ID.types, 'DEPORTISTA'), false],
      ['delegationId', delegationId, false],
      ['macroRegionId', byCode(ID.macros, 'M1'), false],
      ['isActive', 'true', false],
    ],
    description: 'Activa los filtros que quieras probar.',
  });
  add({ name: 'Buscar sin tildes ("perez juan")', path: '/participants', query: [['search', 'perez juan']], description: 'Encuentra "Pérez" aunque no escribas la tilde. Cada palabra debe coincidir.' });
  const created = fromResponse(ID.createParticipant, '$.id', null);
  add({ name: 'Ver deportista creado', path: `/participants/${created}` });
  add({
    name: 'Editar deportista creado',
    method: 'PATCH',
    path: `/participants/${created}`,
    body: { phone: '912345678', maternalLastName: null },
    description: '`null` vacía un campo opcional. El `status` no se puede enviar (400).',
  });
  add({ name: 'Desactivar deportista creado (ADMIN)', method: 'PATCH', path: `/participants/${created}/active`, body: { isActive: false } });
  add({ name: 'Reactivar deportista creado (ADMIN)', method: 'PATCH', path: `/participants/${created}/active`, body: { isActive: true } });
});

folder(
  '06 · Documentos',
  'Usa el deportista creado en 05 (delegación M1). Orden: Resolución Directoral → subir archivos → revisar. En cada subida elige el archivo en Body → campo "file".',
  (add) => {
    const participant = fromResponse(ID.createParticipant, '$.id', null);
    const docs = `/participants/${participant}/documents`;
    const m1 = byCode(ID.macros, 'M1');
    add({ name: 'Ficha documental', path: docs, description: 'Requisitos, estado de cada documento y habilitación (`eligibility.canPrint`).' });
    add({ name: 'Subir Resolución Directoral de M1', method: 'POST', path: `/macro-regions/${m1}/resolution`, upload: true, description: 'ADMIN o COORDINADOR. Solo PDF. Se sube una vez por macrorregión.' });
    add({ name: 'Ver Resolución Directoral de M1', path: `/macro-regions/${m1}/resolution/file`, description: 'Enlace temporal (url + expiresAt).' });
    add({
      name: 'Vincular resolución al deportista',
      method: 'POST',
      path: `/macro-regions/${m1}/resolution/links`,
      body: { participantIds: [participant] },
      description: 'Figurar en la resolución equivale a requisito aprobado.',
    });
    const uploads = [
      ['DNI', 'DNI', 'PDF, JPG o PNG'],
      ['CERTIFICADO_MEDICO', 'certificado médico', 'PDF, JPG o PNG'],
      ['SEGURO', 'seguro', 'PDF, JPG o PNG'],
      ['FOTO', 'foto', 'solo JPG o PNG'],
    ];
    for (const [code, label, formats] of uploads) {
      add({
        name: `Subir ${label}`,
        method: 'POST',
        path: `${docs}/${code}`,
        upload: true,
        description: `Formato: ${formats}. Máximo 5 MB. Queda PENDING para revisión.`,
      });
    }
    add({ name: 'Ver archivo del DNI', path: `${docs}/DNI/file`, description: 'Enlace temporal: ábrelo en el navegador antes de que expire.' });
    for (const [code, label] of uploads) {
      add({ name: `Aprobar ${label}`, method: 'PATCH', path: `${docs}/${code}/review`, body: { status: 'APPROVED' }, description: 'Requiere archivo cargado.' });
    }
    add({
      name: 'Observar certificado médico',
      method: 'PATCH',
      path: `${docs}/CERTIFICADO_MEDICO/review`,
      body: { status: 'OBSERVED', observation: 'El certificado está vencido.' },
      description: 'Bloquea la impresión: el participante pasa a OBSERVED.',
    });
    add({
      name: 'Marcar "no aplica" certificado médico',
      method: 'PATCH',
      path: `${docs}/CERTIFICADO_MEDICO/review`,
      body: { status: 'NOT_APPLICABLE', observation: 'Exonerado por la organización.' },
      description: 'Cuenta como requisito cumplido.',
    });
    add({ name: 'Devolver a pendiente certificado médico', method: 'PATCH', path: `${docs}/CERTIFICADO_MEDICO/review`, body: { status: 'PENDING' } });
  },
);

folder('07 · Auditoría (ADMIN)', 'Historial de solo lectura. Solo ADMIN.', (add) => {
  add({
    name: 'Historial general',
    path: '/audit-logs',
    query: [['page', '1'], ['limit', '20'], ['action', 'UPDATE', false], ['entity', 'Participant', false], ['from', '2026-10-01', false], ['to', '2026-12-31', false]],
    description: 'Más reciente primero. Fechas en hora de Perú.',
  });
  add({
    name: 'Historial del deportista creado',
    path: '/audit-logs',
    query: [['participantId', fromResponse(ID.createParticipant, '$.id', null)]],
    description: 'Alta y ediciones con el campo afectado, valor anterior y nuevo, y quién lo hizo.',
  });
});

folder('08 · Errores esperados', 'Cada petición debe FALLAR con el código indicado: comprueba las reglas y mensajes.', (add) => {
  add({ name: '401 · Sin token', path: '/auth/me', auth: 'none', description: 'Esperado: **401** "Sesión inválida o expirada."' });
  add({ name: '401 · Contraseña incorrecta', method: 'POST', path: '/auth/login', auth: 'none', body: { email: v('email'), password: 'incorrecta' }, description: 'Esperado: **401** con mensaje genérico. Cuenta para el límite de 5 intentos por minuto.' });
  add({ name: '400 · Campo no permitido', method: 'POST', path: '/participants', body: { status: 'DELIVERED' }, description: 'Esperado: **400** "El campo status no está permitido." y los campos obligatorios faltantes.' });
  add({
    name: '400 · DNI inválido',
    method: 'POST',
    path: '/participants',
    body: { documentType: 'DNI', documentNumber: '1234', firstNames: 'X', paternalLastName: 'Y', gender: 'MALE', birthDate: '2012-01-01', participantTypeId: byCode(ID.types, 'DEPORTISTA'), delegationId: fromResponse(ID.findDelegation, '$.data[0].id') },
    description: 'Esperado: **400** "El DNI debe tener exactamente 8 dígitos."',
  });
  add({
    name: '400 · Deportista sin delegación',
    method: 'POST',
    path: '/participants',
    body: { documentType: 'CE', documentNumber: 'CE123456', firstNames: 'X', paternalLastName: 'Y', participantTypeId: byCode(ID.types, 'DEPORTISTA') },
    description: 'Esperado: **400** con delegación, género y fecha de nacimiento obligatorios.',
  });
  add({ name: '400 · Paginación fuera de rango', path: '/participants', query: [['limit', '500'], ['page', '0']], description: 'Esperado: **400** (limit máximo 100, page mínimo 1).' });
  add({ name: '404 · Participante inexistente', path: '/participants/00000000-0000-4000-8000-000000000000' });
  add({ name: '400 · Id que no es UUID', path: '/participants/123', description: 'Esperado: **400** "El identificador no es un UUID válido."' });
  add({ name: '403 · Operador lista usuarios', path: '/users', description: 'Usa el entorno **Operador** (y ejecuta Login). Esperado: **403**.' });
});

// ── Workspace y entornos ──────────────────────────────────────────
const env = (id, name, variables, parentModel = 'environment') => ({
  model: 'environment',
  id,
  workspaceId: WS,
  name,
  parentModel,
  parentId: null,
  public: true,
  variables: Object.entries(variables).map(([name, value]) => ({ name, value, enabled: true })),
});

const collection = {
  yaakVersion: '2026.2.0',
  yaakSchema: 4,
  timestamp: new Date().toISOString().slice(0, 19),
  resources: {
    workspaces: [
      {
        model: 'workspace',
        id: WS,
        name: 'JEDPA API',
        description:
          'API del sistema de credenciales JEDPA (NestJS, puerto 4000).\n\n' +
          '1. Levanta el backend: `docker compose up -d`, `npm run migration:run`, `npm run seed`, `npm run start:dev`.\n' +
          '2. Elige el entorno **Admin**, **Coordinador** u **Operador** (arriba a la izquierda).\n' +
          '3. Ejecuta **01 · Autenticación → Login**. El token se aplica solo a todas las peticiones.\n' +
          '4. Recorre las carpetas en orden (00 → 08).\n\n' +
          'Al cambiar de entorno, vuelve a ejecutar **Login**.',
        authenticationType: 'bearer',
        authentication: { token: TOKEN },
        headers: [],
        settingValidateCertificates: true,
        settingFollowRedirects: true,
        settingRequestTimeout: 0,
      },
    ],
    environments: [
      env('ev_JdpGlobal1', 'Global Variables', { baseUrl: 'http://localhost:4000/api', password: 'password123', email: 'admin@jedpa.local' }, 'workspace'),
      env('ev_JdpAdmin01', 'Admin', { email: 'admin@jedpa.local' }),
      env('ev_JdpCoord01', 'Coordinador', { email: 'coordinador@jedpa.local' }),
      env('ev_JdpOper001', 'Operador', { email: 'operador@jedpa.local' }),
    ],
    folders,
    httpRequests: requests,
    grpcRequests: [],
    websocketRequests: [],
  },
};

writeFileSync(out, `${JSON.stringify(collection, null, 2)}\n`);
console.log(`Generado ${out}: ${folders.length} carpetas, ${requests.length} peticiones.`);
