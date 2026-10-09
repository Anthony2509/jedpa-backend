import request from 'supertest';
import {
  E2E_ADMIN,
  TestApp,
  catalogId,
  createTestApp,
  loginAs,
  devUser,
} from './e2e-utils';

type Role = 'ADMIN' | 'COORDINADOR' | 'OPERADOR';
type Auth = { Authorization: string };
const ALL: Role[] = ['ADMIN', 'COORDINADOR', 'OPERADOR'];

/**
 * Matriz de permisos del Sprint 1 (docs/SPEC.md §2 y §13).
 * Cada caso se prueba con los tres roles: los permitidos no reciben 403;
 * los demás, sí. Sin token, todo responde 401.
 */
describe('Matriz de permisos (e2e)', () => {
  let app: TestApp;
  const auth = {} as Record<Role, Auth>;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    app = await createTestApp();
    auth.ADMIN = await loginAs(app, E2E_ADMIN.email, E2E_ADMIN.password);

    for (const role of ['COORDINADOR', 'OPERADOR'] as const) {
      const { email, password } = devUser(role);
      auth[role] = await loginAs(app, email, password);
    }

    ids.macro = await catalogId(app, auth.ADMIN, 'macro-regions', 'M2');
    ids.sport = await catalogId(app, auth.ADMIN, 'sports', 'FTB');
    ids.regular = await catalogId(
      app,
      auth.ADMIN,
      'participant-types',
      'DEPORTISTA',
    );
    ids.special = await catalogId(
      app,
      auth.ADMIN,
      'participant-types',
      'MINEDU',
    );
    const delegation = await request(app.getHttpServer())
      .post('/api/delegations')
      .set(auth.ADMIN)
      .send({
        macroRegionId: ids.macro,
        sportId: ids.sport,
        category: 'A',
        gender: 'V',
      })
      .expect(201);
    ids.delegation = (delegation.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  let seq = 0;
  const unique = () => String(++seq).padStart(4, '0');

  interface Case {
    name: string;
    method: 'get' | 'post' | 'patch';
    path: () => string;
    body?: (role: Role) => object;
    allowed: Role[];
  }

  const cases: Case[] = [
    {
      name: 'listar usuarios',
      method: 'get',
      path: () => '/api/users',
      allowed: ['ADMIN'],
    },
    {
      name: 'listar roles',
      method: 'get',
      path: () => '/api/roles',
      allowed: ['ADMIN'],
    },
    {
      name: 'ver auditoría',
      method: 'get',
      path: () => '/api/audit-logs',
      allowed: ['ADMIN'],
    },
    {
      name: 'listar lugares de entrega',
      method: 'get',
      path: () => '/api/delivery-places',
      allowed: ALL,
    },
    {
      name: 'crear lugar de entrega',
      method: 'post',
      path: () => '/api/delivery-places',
      body: (role) => ({ name: `Lugar ${role} ${unique()}` }),
      allowed: ['ADMIN'],
    },
    ...[
      'participant-types',
      'macro-regions',
      'sports',
      'document-types',
      'document-requirements',
    ].map((path): Case => ({
      name: `leer ${path}`,
      method: 'get',
      path: () => `/api/${path}`,
      allowed: ALL,
    })),
    {
      name: 'listar delegaciones',
      method: 'get',
      path: () => '/api/delegations',
      allowed: ALL,
    },
    {
      name: 'crear delegación',
      method: 'post',
      path: () => '/api/delegations',
      body: (role) => ({
        macroRegionId: ids.macro,
        sportId: ids.sport,
        category: { ADMIN: 'B', COORDINADOR: 'C', OPERADOR: 'D' }[role],
        gender: 'D',
      }),
      allowed: ['ADMIN', 'COORDINADOR'],
    },
    {
      name: 'listar participantes',
      method: 'get',
      path: () => '/api/participants',
      allowed: ALL,
    },
    {
      name: 'hoja de prueba de impresión',
      method: 'get',
      path: () => '/api/credentials/test-sheet',
      allowed: ['ADMIN', 'COORDINADOR'],
    },
    {
      name: 'crear participante regular',
      method: 'post',
      path: () => '/api/participants',
      body: () => ({
        documentType: 'DNI',
        documentNumber: `7000${unique()}`,
        firstNames: 'Ana',
        paternalLastName: 'Permisos',
        gender: 'FEMALE',
        birthDate: '2011-03-15',
        participantTypeId: ids.regular,
        delegationId: ids.delegation,
      }),
      allowed: ALL,
    },
    {
      name: 'crear credencial especial',
      method: 'post',
      path: () => '/api/participants',
      body: () => ({
        documentType: 'DNI',
        documentNumber: `8000${unique()}`,
        firstNames: 'Luis',
        paternalLastName: 'Especial',
        participantTypeId: ids.special,
        institution: 'MINEDU',
      }),
      allowed: ['ADMIN', 'COORDINADOR'],
    },
  ];

  describe.each(cases)('$name', (c) => {
    it.each(ALL)('%s', async (role) => {
      const res = await request(app.getHttpServer())
        [c.method](c.path())
        .set(auth[role])
        .send(c.body?.(role));
      if (c.allowed.includes(role)) {
        expect([200, 201]).toContain(res.status);
      } else {
        expect(res.status).toBe(403);
      }
    });

    it('sin token responde 401', () =>
      request(app.getHttpServer())
        [c.method](c.path())
        .send(c.body?.('ADMIN'))
        .expect(401));
  });

  describe('Documentos', () => {
    const PDF = Buffer.from('%PDF-1.4\n%%EOF');
    let documentsPath: string;

    beforeAll(async () => {
      const created = await request(app.getHttpServer())
        .post('/api/participants')
        .set(auth.ADMIN)
        .send({
          documentType: 'DNI',
          documentNumber: `6000${unique()}`,
          firstNames: 'Doc',
          paternalLastName: 'Permisos',
          gender: 'MALE',
          birthDate: '2011-03-15',
          participantTypeId: ids.regular,
          delegationId: ids.delegation,
        })
        .expect(201);
      const { id } = created.body as { id: string };
      documentsPath = `/api/participants/${id}/documents`;
    });

    it.each(ALL)('%s ve la ficha documental', (role) =>
      request(app.getHttpServer())
        .get(documentsPath)
        .set(auth[role])
        .expect(200),
    );

    it.each(ALL)('%s sube documentos de participantes regulares', (role) =>
      request(app.getHttpServer())
        .post(`${documentsPath}/SEGURO`)
        .set(auth[role])
        .attach('file', PDF, 'seguro.pdf')
        .expect(201),
    );

    it.each(ALL)('%s revisa documentos de participantes regulares', (role) =>
      request(app.getHttpServer())
        .patch(`${documentsPath}/SEGURO/review`)
        .set(auth[role])
        .send({ status: 'APPROVED' })
        .expect(200),
    );

    it.each([
      ['ADMIN', 201],
      ['COORDINADOR', 201],
      ['OPERADOR', 403],
    ] as const)('%s carga la Resolución Directoral → %i', (role, status) =>
      request(app.getHttpServer())
        .post(`/api/macro-regions/${ids.macro}/resolution`)
        .set(auth[role])
        .attach('file', PDF, 'rd.pdf')
        .expect(status),
    );

    it('sin token no hay acceso a documentos', () =>
      request(app.getHttpServer()).get(documentsPath).expect(401));
  });

  it('la verificación del QR es pública (sin token no responde 401)', () =>
    request(app.getHttpServer())
      .get('/api/verify/token-inexistente-1234567890')
      .expect(404));

  it.each(ALL)(
    '%s ve los ejemplares impresos de un participante',
    async (role) => {
      const list = await request(app.getHttpServer())
        .get('/api/participants')
        .set(auth.ADMIN)
        .expect(200);
      const [first] = (list.body as { data: { id: string }[] }).data;
      await request(app.getHttpServer())
        .get(`/api/participants/${first.id}/credentials`)
        .set(auth[role])
        .expect(200);
    },
  );

  it('solo ADMIN activa o desactiva participantes', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/participants')
      .set(auth.ADMIN)
      .send({
        documentType: 'DNI',
        documentNumber: `9000${unique()}`,
        firstNames: 'Eva',
        paternalLastName: 'Activa',
        gender: 'FEMALE',
        birthDate: '2011-03-15',
        participantTypeId: ids.regular,
        delegationId: ids.delegation,
      })
      .expect(201);
    const path = `/api/participants/${(created.body as { id: string }).id}/active`;

    for (const role of ['COORDINADOR', 'OPERADOR'] as const) {
      await request(app.getHttpServer())
        .patch(path)
        .set(auth[role])
        .send({ isActive: false })
        .expect(403);
    }
    await request(app.getHttpServer())
      .patch(path)
      .set(auth.ADMIN)
      .send({ isActive: false })
      .expect(200);
  });

  it('el OPERADOR no edita credenciales especiales', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/participants')
      .set(auth.COORDINADOR)
      .send({
        documentType: 'CE',
        documentNumber: `CE${unique()}XYZ`,
        firstNames: 'Rosa',
        paternalLastName: 'Invitada',
        participantTypeId: ids.special,
        institution: 'Prensa',
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/participants/${(created.body as { id: string }).id}`)
      .set(auth.OPERADOR)
      .send({ institution: 'Otra' })
      .expect(403);
  });
});
