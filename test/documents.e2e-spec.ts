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

interface Checklist {
  eligibility: { status: string; documentStatus: string; canPrint: boolean };
  documents: {
    documentType: { code: string };
    required: boolean;
    status: string;
    observation: string | null;
    file: { originalName: string; mimeType: string } | null;
    reviewedBy: { fullName: string } | null;
  }[];
}

export const PDF = Buffer.from('%PDF-1.4\n% JEDPA prueba\n%%EOF');
export const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);

describe('Documentos y Resolución Directoral (e2e)', () => {
  let app: TestApp;
  let admin: Auth;
  let operator: Auth;
  const ids: Record<string, string> = {};
  const server = () => app.getHttpServer();

  const docsOf = async (participantId: string): Promise<Checklist> =>
    (
      await request(server())
        .get(`/api/participants/${participantId}/documents`)
        .set(admin)
        .expect(200)
    ).body as Checklist;

  const item = (checklist: Checklist, code: string) =>
    checklist.documents.find((d) => d.documentType.code === code)!;

  const upload = (
    participantId: string,
    code: string,
    file: Buffer,
    filename: string,
    auth: Auth = admin,
  ) =>
    request(server())
      .post(`/api/participants/${participantId}/documents/${code}`)
      .set(auth)
      .attach('file', file, filename);

  beforeAll(async () => {
    app = await createTestApp();
    admin = await loginAs(app, E2E_ADMIN.email, E2E_ADMIN.password);
    const op = devUser('OPERADOR');
    operator = await loginAs(app, op.email, op.password);

    ids.m3 = await catalogId(app, admin, 'macro-regions', 'M3');
    ids.m4 = await catalogId(app, admin, 'macro-regions', 'M4');
    ids.nat = await catalogId(app, admin, 'sports', 'NAT');
    ids.invitado = await catalogId(app, admin, 'participant-types', 'INVITADO');
    const delegation = await request(server())
      .post('/api/delegations')
      .set(admin)
      .send({
        macroRegionId: ids.m3,
        sportId: ids.nat,
        category: 'C',
        gender: 'V',
      })
      .expect(201);
    ids.delegation = (delegation.body as { id: string }).id;

    const deportista = await catalogId(
      app,
      admin,
      'participant-types',
      'DEPORTISTA',
    );
    const create = async (documentNumber: string) =>
      (
        (
          await request(server())
            .post('/api/participants')
            .set(admin)
            .send({
              documentType: 'DNI',
              documentNumber,
              firstNames: 'Lucía',
              paternalLastName: 'Documentos',
              gender: 'FEMALE',
              birthDate: '2011-07-01',
              participantTypeId: deportista,
              delegationId: ids.delegation,
            })
            .expect(201)
        ).body as { id: string }
      ).id;
    ids.participant = await create('31000001');
    ids.second = await create('31000002');

    const special = await request(server())
      .post('/api/participants')
      .set(admin)
      .send({
        documentType: 'DNI',
        documentNumber: '31000003',
        firstNames: 'Mario',
        paternalLastName: 'Invitado',
        participantTypeId: ids.invitado,
        institution: 'Prensa',
      })
      .expect(201);
    ids.special = (special.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('la ficha lista los 11 documentos con los 5 obligatorios primero', async () => {
    const checklist = await docsOf(ids.participant);
    expect(checklist.documents).toHaveLength(11);
    expect(checklist.documents.filter((d) => d.required)).toHaveLength(5);
    expect(checklist.documents.slice(0, 5).every((d) => d.required)).toBe(true);
    expect(checklist.eligibility).toEqual({
      status: 'PENDING_DOCUMENTS',
      documentStatus: 'PENDING_DOCUMENTS',
      canPrint: false,
    });
  });

  describe('Subida', () => {
    it('sube un PDF y queda pendiente de revisión', async () => {
      const res = await upload(ids.participant, 'dni', PDF, 'dni.pdf').expect(
        201,
      );
      const dni = item(res.body as Checklist, 'DNI');
      expect(dni).toMatchObject({
        status: 'PENDING',
        file: { originalName: 'dni.pdf', mimeType: 'application/pdf' },
      });
    });

    it('rechaza un archivo cuyo contenido no es PDF ni imagen', async () => {
      const res = await upload(
        ids.participant,
        'SEGURO',
        Buffer.from('MZ ejecutable'),
        'seguro.pdf',
      ).expect(400);
      expect(res.body).toMatchObject({
        message: 'Formato no permitido. Se aceptan: PDF, JPG, PNG.',
      });
    });

    it('la foto solo admite imágenes', async () => {
      await upload(ids.participant, 'FOTO', PDF, 'foto.pdf').expect(400);
      await upload(ids.participant, 'FOTO', PNG, 'foto.png').expect(201);
    });

    it('exige el campo file', () =>
      request(server())
        .post(`/api/participants/${ids.participant}/documents/SEGURO`)
        .set(admin)
        .expect(400));

    it('responde 404 ante un tipo de documento inexistente', () =>
      upload(ids.participant, 'NO_EXISTE', PDF, 'x.pdf').expect(404));

    it('el OPERADOR no gestiona documentos de credenciales especiales', () =>
      upload(ids.special, 'FOTO', PNG, 'foto.png', operator).expect(403));
  });

  describe('Acceso a archivos', () => {
    it('entrega un enlace temporal que sirve el archivo original', async () => {
      const res = await request(server())
        .get(`/api/participants/${ids.participant}/documents/DNI/file`)
        .set(admin)
        .expect(200);
      const { url, expiresAt } = res.body as { url: string; expiresAt: string };
      expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());

      const path = new URL(url).pathname;
      const file = await request(server()).get(path).expect(200);
      expect(file.headers['content-type']).toBe('application/pdf');
      expect(file.headers['cache-control']).toBe('private, no-store');
      expect(Buffer.from(file.body as Buffer).equals(PDF)).toBe(true);
    });

    it('rechaza un enlace manipulado', async () => {
      const res = await request(server())
        .get(`/api/participants/${ids.participant}/documents/DNI/file`)
        .set(admin);
      const path = new URL((res.body as { url: string }).url).pathname;
      await request(server()).get(`${path}x`).expect(404);
    });

    it('responde 404 si el documento no tiene archivo', () =>
      request(server())
        .get(`/api/participants/${ids.participant}/documents/SEGURO/file`)
        .set(admin)
        .expect(404));
  });

  describe('Resolución Directoral', () => {
    it('no se vincula antes de cargarla', () =>
      request(server())
        .post(`/api/macro-regions/${ids.m3}/resolution/links`)
        .set(admin)
        .send({ participantIds: [ids.participant] })
        .expect(409));

    it('solo admite PDF y la carga ADMIN o COORDINADOR', async () => {
      await request(server())
        .post(`/api/macro-regions/${ids.m3}/resolution`)
        .set(admin)
        .attach('file', PNG, 'rd.png')
        .expect(400);
      await request(server())
        .post(`/api/macro-regions/${ids.m3}/resolution`)
        .set(operator)
        .attach('file', PDF, 'rd.pdf')
        .expect(403);
      const res = await request(server())
        .post(`/api/macro-regions/${ids.m3}/resolution`)
        .set(admin)
        .attach('file', PDF, 'rd-m3.pdf')
        .expect(201);
      expect(
        (res.body as { resolutionFileId: string }).resolutionFileId,
      ).toBeTruthy();
    });

    it('rechaza participantes de otra macrorregión', async () => {
      await request(server())
        .post(`/api/macro-regions/${ids.m4}/resolution`)
        .set(admin)
        .attach('file', PDF, 'rd-m4.pdf')
        .expect(201);
      await request(server())
        .post(`/api/macro-regions/${ids.m4}/resolution/links`)
        .set(admin)
        .send({ participantIds: [ids.participant] })
        .expect(400);
    });

    it('vincular la resolución la aprueba en cada perfil (un solo archivo)', async () => {
      const res = await request(server())
        .post(`/api/macro-regions/${ids.m3}/resolution/links`)
        .set(operator)
        .send({ participantIds: [ids.participant, ids.second] })
        .expect(201);
      expect(res.body).toEqual({ linked: 2 });

      for (const id of [ids.participant, ids.second]) {
        const rd = item(await docsOf(id), 'RESOLUCION_DIRECTORAL');
        expect(rd).toMatchObject({
          status: 'APPROVED',
          file: { originalName: 'rd-m3.pdf' },
          reviewedBy: { fullName: 'Operador' },
        });
      }
    });

    it('con todos los obligatorios subidos el participante pasa a IN_REVIEW', async () => {
      await upload(ids.participant, 'CERTIFICADO_MEDICO', PDF, 'cm.pdf').expect(
        201,
      );
      const res = await upload(
        ids.participant,
        'SEGURO',
        PDF,
        'seguro.pdf',
      ).expect(201);
      expect((res.body as Checklist).eligibility.status).toBe('IN_REVIEW');
    });
  });

  describe('Revisión', () => {
    const review = (
      participantId: string,
      code: string,
      body: object,
      auth: Auth = admin,
    ) =>
      request(server())
        .patch(`/api/participants/${participantId}/documents/${code}/review`)
        .set(auth)
        .send(body);

    it('no aprueba un documento sin archivo', () =>
      review(ids.second, 'SEGURO', { status: 'APPROVED' }).expect(409));

    it('observar exige indicar la observación', () =>
      review(ids.participant, 'DNI', { status: 'OBSERVED' }).expect(400));

    it('con todos los obligatorios aprobados queda READY_TO_PRINT', async () => {
      for (const code of ['DNI', 'CERTIFICADO_MEDICO', 'SEGURO']) {
        await review(
          ids.participant,
          code,
          { status: 'APPROVED' },
          operator,
        ).expect(200);
      }
      const res = await review(ids.participant, 'FOTO', {
        status: 'APPROVED',
      }).expect(200);
      const checklist = res.body as Checklist;
      expect(checklist.eligibility).toEqual({
        status: 'READY_TO_PRINT',
        documentStatus: 'READY_TO_PRINT',
        canPrint: true,
      });
      expect(item(checklist, 'DNI').reviewedBy).toEqual(
        expect.objectContaining({ fullName: 'Operador' }),
      );
    });

    it('una observación bloquea la impresión y queda visible', async () => {
      const res = await review(ids.participant, 'CERTIFICADO_MEDICO', {
        status: 'OBSERVED',
        observation: 'El certificado está vencido.',
      }).expect(200);
      const checklist = res.body as Checklist;
      expect(checklist.eligibility).toMatchObject({
        status: 'OBSERVED',
        canPrint: false,
      });
      expect(item(checklist, 'CERTIFICADO_MEDICO')).toMatchObject({
        status: 'OBSERVED',
        observation: 'El certificado está vencido.',
      });
    });

    it('"no aplica" cuenta como requisito cumplido', async () => {
      const res = await review(ids.participant, 'CERTIFICADO_MEDICO', {
        status: 'NOT_APPLICABLE',
        observation: 'Exonerado por la organización.',
      }).expect(200);
      expect((res.body as Checklist).eligibility.status).toBe('READY_TO_PRINT');
    });

    it('devolver a pendiente lo deja en revisión', async () => {
      const res = await review(ids.participant, 'CERTIFICADO_MEDICO', {
        status: 'PENDING',
      }).expect(200);
      const checklist = res.body as Checklist;
      expect(checklist.eligibility.status).toBe('IN_REVIEW');
      expect(item(checklist, 'CERTIFICADO_MEDICO').reviewedBy).toBeNull();
    });

    it('reemplazar un archivo aprobado obliga a revisarlo de nuevo', async () => {
      await review(ids.participant, 'CERTIFICADO_MEDICO', {
        status: 'APPROVED',
      }).expect(200);
      const res = await upload(
        ids.participant,
        'DNI',
        PDF,
        'dni-nuevo.pdf',
      ).expect(201);
      const checklist = res.body as Checklist;
      expect(item(checklist, 'DNI')).toMatchObject({
        status: 'PENDING',
        reviewedBy: null,
      });
      expect(checklist.eligibility.status).toBe('IN_REVIEW');
    });

    it('ADMIN ve el historial de revisiones y cambios de estado', async () => {
      const reviews = await request(server())
        .get('/api/audit-logs')
        .query({ participantId: ids.participant, action: 'DOCUMENT_REVIEW' })
        .set(admin)
        .expect(200);
      expect(
        (reviews.body as { meta: { total: number } }).meta.total,
      ).toBeGreaterThanOrEqual(8);

      const statuses = await request(server())
        .get('/api/audit-logs')
        .query({ participantId: ids.participant, action: 'STATUS_CHANGE' })
        .set(admin)
        .expect(200);
      const transitions = (
        statuses.body as { data: { changes: { status: { new: string } } }[] }
      ).data.map((l) => l.changes.status.new);
      expect(transitions).toEqual(
        expect.arrayContaining(['IN_REVIEW', 'READY_TO_PRINT', 'OBSERVED']),
      );
    });
  });

  it('cada subida queda en la auditoría del participante', async () => {
    const res = await request(server())
      .get('/api/audit-logs')
      .query({ participantId: ids.participant, entity: 'ParticipantDocument' })
      .set(admin)
      .expect(200);
    const { meta } = res.body as { meta: { total: number } };
    expect(meta.total).toBeGreaterThanOrEqual(5);
  });
});
