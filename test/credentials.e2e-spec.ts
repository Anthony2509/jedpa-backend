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
/** PNG real de 1×1 píxel: se incrusta en el PDF como foto. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Cuerpo binario (PDF) como Buffer. */
const binary = (
  res: NodeJS.ReadableStream,
  done: (err: Error | null, body: Buffer) => void,
) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => done(null, Buffer.concat(chunks)));
};

const pageCount = (pdf: Buffer) =>
  (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;
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

  describe('PDF imprimible', () => {
    it('descarga el PDF de un ejemplar vigente (anverso y reverso)', async () => {
      const res = await request(server())
        .get(`/api/participants/${ids.regular}/credentials/3/pdf`)
        .set(operator)
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe(
        'inline; filename="credencial-3.pdf"',
      );
      const pdf = res.body as Buffer;
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
      expect(pageCount(pdf)).toBe(2);
    });

    it('no imprime un ejemplar reemplazado ni uno inexistente', async () => {
      await request(server())
        .get(`/api/participants/${ids.regular}/credentials/0/pdf`)
        .set(admin)
        .expect(409);
      await request(server())
        .get(`/api/participants/${ids.notReady}/credentials/0/pdf`)
        .set(admin)
        .expect(404);
    });

    it('emite en lote, informa los omitidos y arma un solo PDF', async () => {
      const minedu = await catalogId(app, admin, 'participant-types', 'MINEDU');
      const created: string[] = [];
      for (const documentNumber of ['42000001', '42000002']) {
        const res = await request(server())
          .post('/api/participants')
          .set(admin)
          .send({
            documentType: 'DNI',
            documentNumber,
            firstNames: 'Lote',
            paternalLastName: 'Especial',
            participantTypeId: minedu,
            institution: 'MINEDU',
          })
          .expect(201);
        created.push((res.body as { id: string }).id);
      }

      const batch = await request(server())
        .post('/api/credentials/batch')
        .set(admin)
        .send({ participantIds: [...created, ids.notReady] })
        .expect(200);
      const result = batch.body as {
        issued: { participantId: string; copyId: string }[];
        skipped: { participantId: string; reason: string }[];
      };
      expect(result.issued.map((i) => i.participantId)).toEqual(created);
      expect(result.skipped).toEqual([
        {
          participantId: ids.notReady,
          reason: expect.stringContaining('requisitos') as string,
        },
      ]);

      const pdf = await request(server())
        .post('/api/credentials/pdf')
        .set(admin)
        .send({ copyIds: result.issued.map((i) => i.copyId) })
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect(pageCount(pdf.body as Buffer)).toBe(4);
    });

    it('la hoja de prueba es solo para ADMIN y COORDINADOR', async () => {
      await request(server())
        .get('/api/credentials/test-sheet')
        .set(operator)
        .expect(403);
      const res = await request(server())
        .get('/api/credentials/test-sheet')
        .set(admin)
        .buffer(true)
        .parse(binary)
        .expect(200);
      expect(pageCount(res.body as Buffer)).toBe(2);
    });

    it('cada descarga de PDF queda auditada', async () => {
      const res = await request(server())
        .get('/api/audit-logs')
        .query({
          participantId: ids.regular,
          action: 'FILE_ACCESS',
          entity: 'CredentialCopy',
        })
        .set(admin)
        .expect(200);
      expect(
        (res.body as { meta: { total: number } }).meta.total,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it('cada impresión queda auditada (PRINT / REPRINT)', async () => {
    const res = await request(server())
      .get('/api/audit-logs')
      .query({ participantId: ids.regular, entity: 'CredentialCopy' })
      .set(admin)
      .expect(200);
    // Solo emisiones: las descargas de PDF se registran aparte como FILE_ACCESS.
    const actions = (res.body as { data: { action: string }[] }).data
      .map((l) => l.action)
      .filter((action) => action !== 'FILE_ACCESS');
    expect(actions.sort()).toEqual(['PRINT', 'REPRINT', 'REPRINT', 'REPRINT']);
  });
});
