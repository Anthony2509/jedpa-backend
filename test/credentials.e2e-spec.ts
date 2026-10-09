import request from 'supertest';
import {
  catalogId,
  createTestApp,
  devUser,
  E2E_ADMIN,
  loginAs,
  TestApp,
} from './e2e-utils';

type Auth = { Authorization: string };

interface CopyBody {
  id: string;
  copyNumber: number;
  label: string;
  isRevoked: boolean;
  reason: string | null;
  verificationUrl: string;
  printedBy: { fullName: string };
}

const PDF = Buffer.from('%PDF-1.4\n%%EOF');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const REQUIRED = [
  'RESOLUCION_DIRECTORAL',
  'DNI',
  'CERTIFICADO_MEDICO',
  'SEGURO',
  'FOTO',
];

describe('Impresión de credenciales (e2e)', () => {
  let app: TestApp;
  let admin: Auth;
  let operator: Auth;
  const ids: Record<string, string> = {};
  const server = () => app.getHttpServer();

  const issue = (participantId: string, body: object, auth: Auth = admin) =>
    request(server())
      .post(`/api/participants/${participantId}/credentials`)
      .set(auth)
      .send(body);

  const statusOf = async (participantId: string) =>
    (
      (
        await request(server())
          .get(`/api/participants/${participantId}`)
          .set(admin)
          .expect(200)
      ).body as { status: string }
    ).status;

  /** Sube y aprueba todos los requisitos de un deportista. */
  const makeReady = async (participantId: string) => {
    const base = `/api/participants/${participantId}/documents`;
    for (const code of REQUIRED) {
      await request(server())
        .post(`${base}/${code}`)
        .set(admin)
        .attach(
          'file',
          code === 'FOTO' ? PNG : PDF,
          `${code}.${code === 'FOTO' ? 'png' : 'pdf'}`,
        )
        .expect(201);
      await request(server())
        .patch(`${base}/${code}/review`)
        .set(admin)
        .send({ status: 'APPROVED' })
        .expect(200);
    }
  };

  beforeAll(async () => {
    app = await createTestApp();
    admin = await loginAs(app, E2E_ADMIN.email, E2E_ADMIN.password);
    const op = devUser('OPERADOR');
    operator = await loginAs(app, op.email, op.password);

    const macroRegionId = await catalogId(app, admin, 'macro-regions', 'M5');
    const sportId = await catalogId(app, admin, 'sports', 'VOL');
    const deportista = await catalogId(
      app,
      admin,
      'participant-types',
      'DEPORTISTA',
    );
    const minedu = await catalogId(app, admin, 'participant-types', 'MINEDU');

    const delegation = await request(server())
      .post('/api/delegations')
      .set(admin)
      .send({ macroRegionId, sportId, category: 'A', gender: 'D' })
      .expect(201);
    const delegationId = (delegation.body as { id: string }).id;

    const createRegular = async (documentNumber: string) =>
      (
        (
          await request(server())
            .post('/api/participants')
            .set(admin)
            .send({
              documentType: 'DNI',
              documentNumber,
              firstNames: 'Rosa',
              paternalLastName: 'Impresión',
              gender: 'FEMALE',
              birthDate: '2010-02-02',
              participantTypeId: deportista,
              delegationId,
            })
            .expect(201)
        ).body as { id: string }
      ).id;
    ids.regular = await createRegular('41000001');
    ids.notReady = await createRegular('41000002');

    const special = await request(server())
      .post('/api/participants')
      .set(admin)
      .send({
        documentType: 'DNI',
        documentNumber: '41000003',
        firstNames: 'Carlos',
        paternalLastName: 'Minedu',
        participantTypeId: minedu,
        institution: 'MINEDU',
      })
      .expect(201);
    ids.special = (special.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloquea la impresión si faltan requisitos', async () => {
    const res = await issue(ids.notReady, { copyNumber: 0 }).expect(409);
    expect((res.body as { message: string }).message).toContain(
      'PENDING_DOCUMENTS',
    );
  });

  it('imprime el original de un deportista habilitado (OPERADOR)', async () => {
    await makeReady(ids.regular);
    expect(await statusOf(ids.regular)).toBe('READY_TO_PRINT');

    const res = await issue(ids.regular, { copyNumber: 0 }, operator).expect(
      201,
    );
    const copy = res.body as CopyBody;
    expect(copy).toMatchObject({
      copyNumber: 0,
      label: 'Original',
      isRevoked: false,
      printedBy: { fullName: 'Operador' },
    });
    expect(copy.verificationUrl).toMatch(/\/verificar\/[\w-]{32}$/);
    expect(await statusOf(ids.regular)).toBe('PRINTED');
  });

  it('un doble clic no emite dos ejemplares', () =>
    issue(ids.regular, { copyNumber: 0 }, operator).expect(409));

  it('un duplicado exige motivo', () =>
    issue(ids.regular, { copyNumber: 1 }).expect(400));

  it('el duplicado revoca el QR anterior', async () => {
    await issue(ids.regular, { copyNumber: 1, reason: 'Pérdida' }).expect(201);
    const res = await request(server())
      .get(`/api/participants/${ids.regular}/credentials`)
      .set(admin)
      .expect(200);
    const copies = res.body as CopyBody[];
    expect(copies.map((c) => [c.label, c.isRevoked])).toEqual([
      ['Original', true],
      ['Duplicado 1', false],
    ]);
    expect(copies[1].reason).toBe('Pérdida');
  });

  it('los cambios documentales no retroceden un estado impreso, pero bloquean duplicados', async () => {
    await request(server())
      .patch(`/api/participants/${ids.regular}/documents/SEGURO/review`)
      .set(admin)
      .send({ status: 'OBSERVED', observation: 'Póliza vencida.' })
      .expect(200);
    expect(await statusOf(ids.regular)).toBe('PRINTED');
    await issue(ids.regular, { copyNumber: 2, reason: 'Deterioro' }).expect(
      409,
    );

    await request(server())
      .patch(`/api/participants/${ids.regular}/documents/SEGURO/review`)
      .set(admin)
      .send({ status: 'APPROVED' })
      .expect(200);
    await issue(ids.regular, { copyNumber: 2, reason: 'Deterioro' }).expect(
      201,
    );
  });

  it('no cambia el tipo de participante después de imprimir', async () => {
    const minedu = await catalogId(app, admin, 'participant-types', 'MINEDU');
    await request(server())
      .patch(`/api/participants/${ids.regular}`)
      .set(admin)
      .send({ participantTypeId: minedu, delegationId: null, institution: 'X' })
      .expect(409);
  });

  it('permite como máximo 3 duplicados', async () => {
    await issue(ids.regular, {
      copyNumber: 3,
      reason: 'Error de impresión',
    }).expect(201);
    await issue(ids.regular, { copyNumber: 3, reason: 'Otra vez' }).expect(409);
  });

  it('credenciales especiales: solo ADMIN o COORDINADOR', async () => {
    await issue(ids.special, { copyNumber: 0 }, operator).expect(403);
    await issue(ids.special, { copyNumber: 0 }).expect(201);
  });

  describe('Verificación pública del QR', () => {
    const tokenOf = (copy: CopyBody) => copy.verificationUrl.split('/').pop()!;
    let copies: CopyBody[];

    beforeAll(async () => {
      copies = (
        await request(server())
          .get(`/api/participants/${ids.regular}/credentials`)
          .set(admin)
          .expect(200)
      ).body as CopyBody[];
    });

    it('sin sesión muestra lo mínimo y el estado documental, sin DNI', async () => {
      const res = await request(server())
        .get(`/api/verify/${tokenOf(copies[3])}`)
        .expect(200);
      expect(res.body).toMatchObject({
        valid: true,
        enabled: true,
        credential: 'Duplicado 3',
        participant: {
          fullName: 'ROSA IMPRESIÓN',
          participantType: 'Deportista',
          delegation: 'M5-VOL-A-D',
          institution: null,
        },
      });
      const body = res.body as {
        documents: { name: string; status: string }[];
      };
      expect(body.documents).toHaveLength(5);
      expect(body.documents.every((d) => d.status === 'APPROVED')).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain('41000001');
      expect(JSON.stringify(res.body)).not.toMatch(/url|file|storage/i);
    });

    it('un ejemplar reemplazado no es válido y no revela datos', async () => {
      const res = await request(server())
        .get(`/api/verify/${tokenOf(copies[0])}`)
        .expect(200);
      expect(res.body).toMatchObject({
        valid: false,
        enabled: false,
        credential: 'Original',
        participant: null,
        documents: [],
      });
    });

    it('refleja al instante una observación posterior a la impresión', async () => {
      await request(server())
        .patch(`/api/participants/${ids.regular}/documents/SEGURO/review`)
        .set(admin)
        .send({ status: 'OBSERVED', observation: 'Póliza vencida.' })
        .expect(200);
      const res = await request(server())
        .get(`/api/verify/${tokenOf(copies[3])}`)
        .expect(200);
      expect(res.body).toMatchObject({ valid: true, enabled: false });
    });

    it('un token inexistente o malformado responde 404', async () => {
      await request(server())
        .get('/api/verify/no-existe-este-token-123456')
        .expect(404);
      await request(server()).get('/api/verify/..%2F..%2Fetc').expect(404);
    });
  });

  it('cada impresión queda auditada (PRINT / REPRINT)', async () => {
    const res = await request(server())
      .get('/api/audit-logs')
      .query({ participantId: ids.regular, entity: 'CredentialCopy' })
      .set(admin)
      .expect(200);
    const actions = (res.body as { data: { action: string }[] }).data.map(
      (l) => l.action,
    );
    expect(actions.sort()).toEqual(['PRINT', 'REPRINT', 'REPRINT', 'REPRINT']);
  });
});
