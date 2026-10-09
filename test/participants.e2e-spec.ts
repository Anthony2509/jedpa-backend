import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  E2E_ADMIN,
  TestApp,
  catalogId,
  createTestApp,
  loginAs,
} from './e2e-utils';

interface ParticipantBody {
  id: string;
  status: string;
  firstNames: string;
  paternalLastName: string;
  participantType: { code: string };
  delegation: { code: string } | null;
}

interface AuditBody {
  data: {
    action: string;
    changes: Record<string, { old: unknown; new: unknown }>;
    user: { email: string } | null;
  }[];
}

describe('Participantes, delegaciones y auditoría (e2e)', () => {
  let app: TestApp;
  let admin: { Authorization: string };
  const ids: Record<string, string> = {};
  const server = () => app.getHttpServer();

  const regular = (overrides: object = {}) => ({
    documentType: 'DNI',
    documentNumber: '00007342',
    firstNames: 'Juan Carlos',
    paternalLastName: 'Pérez',
    maternalLastName: 'Quispe',
    gender: 'MALE',
    birthDate: '2012-05-20',
    participantTypeId: ids.deportista,
    delegationId: ids.delegation,
    schoolName: 'IE Nuestra Señora',
    extraData: { prueba1: 'Ajedrez' },
    ...overrides,
  });

  beforeAll(async () => {
    app = await createTestApp();
    admin = await loginAs(app, E2E_ADMIN.email, E2E_ADMIN.password);
    ids.deportista = await catalogId(
      app,
      admin,
      'participant-types',
      'DEPORTISTA',
    );
    ids.invitado = await catalogId(app, admin, 'participant-types', 'INVITADO');
    ids.m1 = await catalogId(app, admin, 'macro-regions', 'M1');
    ids.ajd = await catalogId(app, admin, 'sports', 'AJD');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Delegaciones', () => {
    it('genera el código M1-AJD-B-D', async () => {
      const res = await request(server())
        .post('/api/delegations')
        .set(admin)
        .send({
          macroRegionId: ids.m1,
          sportId: ids.ajd,
          category: 'b',
          gender: 'D',
        })
        .expect(201);
      const body = res.body as { id: string; code: string };
      expect(body.code).toBe('M1-AJD-B-D');
      ids.delegation = body.id;
    });

    it('no permite delegaciones duplicadas', async () => {
      const res = await request(server())
        .post('/api/delegations')
        .set(admin)
        .send({
          macroRegionId: ids.m1,
          sportId: ids.ajd,
          category: 'B',
          gender: 'D',
        })
        .expect(409);
      expect(res.body).toMatchObject({
        message: 'Ya existe la delegación M1-AJD-B-D.',
      });
    });
  });

  describe('Alta y validaciones', () => {
    it('registra un deportista en PENDING_DOCUMENTS', async () => {
      const res = await request(server())
        .post('/api/participants')
        .set(admin)
        .send(regular())
        .expect(201);
      const body = res.body as ParticipantBody;
      expect(body).toMatchObject({
        status: 'PENDING_DOCUMENTS',
        paternalLastName: 'Pérez',
        delegation: { code: 'M1-AJD-B-D' },
      });
      ids.participant = body.id;
    });

    it('rechaza un documento duplicado con 409 sin exponer datos', async () => {
      const res = await request(server())
        .post('/api/participants')
        .set(admin)
        .send(regular({ firstNames: 'Otro' }))
        .expect(409);
      expect(JSON.stringify(res.body)).not.toContain('00007342');
    });

    it('valida el formato del DNI', async () => {
      const res = await request(server())
        .post('/api/participants')
        .set(admin)
        .send(regular({ documentNumber: '1234' }))
        .expect(400);
      expect(res.body).toMatchObject({
        message: 'El DNI debe tener exactamente 8 dígitos.',
      });
    });

    it('exige delegación, género y nacimiento a los regulares', async () => {
      const res = await request(server())
        .post('/api/participants')
        .set(admin)
        .send(
          regular({
            documentNumber: '12345678',
            delegationId: undefined,
            gender: undefined,
            birthDate: undefined,
          }),
        )
        .expect(400);
      expect((res.body as { message: string[] }).message).toHaveLength(3);
    });

    it('las credenciales especiales nacen READY_TO_PRINT', async () => {
      const res = await request(server())
        .post('/api/participants')
        .set(admin)
        .send({
          documentType: 'PASAPORTE',
          documentNumber: 'ab123456',
          firstNames: 'Ana',
          paternalLastName: 'Ruiz',
          participantTypeId: ids.invitado,
          institution: 'DRE Ucayali',
        })
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'READY_TO_PRINT',
        documentNumber: 'AB123456',
        delegation: null,
      });
    });

    it('no permite fijar el estado por el CRUD', () =>
      request(server())
        .patch(`/api/participants/${ids.participant}`)
        .set(admin)
        .send({ status: 'DELIVERED' })
        .expect(400));
  });

  describe('Búsqueda', () => {
    it.each([
      ['perez juan', 1],
      ['PÉREZ', 1],
      ['señora', 1],
      ['00007', 1],
      ['juan inexistente', 0],
      ['%', 0],
    ])('"%s" → %i resultado(s)', async (search, total) => {
      const res = await request(server())
        .get('/api/participants')
        .query({ search, participantTypeId: ids.deportista })
        .set(admin)
        .expect(200);
      expect((res.body as { meta: { total: number } }).meta.total).toBe(total);
    });
  });

  describe('Edición y cambio de categoría', () => {
    it('vacía campos opcionales con null pero no los obligatorios', async () => {
      await request(server())
        .patch(`/api/participants/${ids.participant}`)
        .set(admin)
        .send({ firstNames: null })
        .expect(400);
      const res = await request(server())
        .patch(`/api/participants/${ids.participant}`)
        .set(admin)
        .send({ maternalLastName: null, phone: '987 654 321' })
        .expect(200);
      expect(res.body).toMatchObject({
        maternalLastName: null,
        phone: '987 654 321',
      });
    });

    it('cambiar a tipo especial recalcula el estado', async () => {
      const res = await request(server())
        .patch(`/api/participants/${ids.participant}`)
        .set(admin)
        .send({
          participantTypeId: ids.invitado,
          delegationId: null,
          institution: 'Prensa',
        })
        .expect(200);
      expect(res.body).toMatchObject({
        status: 'READY_TO_PRINT',
        participantType: { code: 'INVITADO' },
      });
    });
  });

  describe('Auditoría', () => {
    it('registra alta y ediciones con valor anterior y nuevo', async () => {
      const res = await request(server())
        .get('/api/audit-logs')
        .query({ participantId: ids.participant })
        .set(admin)
        .expect(200);
      const logs = (res.body as AuditBody).data;
      expect(logs.map((l) => l.action)).toEqual([
        'STATUS_CHANGE',
        'UPDATE',
        'UPDATE',
        'CREATE',
      ]);
      expect(logs[0].changes.status).toEqual({
        old: 'PENDING_DOCUMENTS',
        new: 'READY_TO_PRINT',
      });
      expect(logs[1].changes.participantTypeId).toBeDefined();
      expect(logs[2].changes.maternalLastName).toEqual({
        old: 'Quispe',
        new: null,
      });
      expect(logs[3].user?.email).toBe(E2E_ADMIN.email);
    });

    it('la tabla de auditoría no admite UPDATE ni DELETE', async () => {
      const db = app.get(DataSource);
      await expect(
        db.query(`UPDATE audit_logs SET ip = '1.1.1.1'`),
      ).rejects.toThrow(/solo inserción/);
      await expect(db.query(`DELETE FROM audit_logs`)).rejects.toThrow(
        /solo inserción/,
      );
    });
  });

  describe('Usuarios', () => {
    it('desactivar un usuario revoca su acceso de inmediato y nunca expone el hash', async () => {
      const password = 'Operador-Clave-2026';
      const roleId = await catalogId(app, admin, 'roles', 'OPERADOR');
      const created = await request(server())
        .post('/api/users')
        .set(admin)
        .send({
          email: 'operador@participantes.test',
          fullName: 'Operador',
          password,
          roleId,
        })
        .expect(201);
      const user = created.body as { id: string };
      expect(created.body).not.toHaveProperty('passwordHash');

      const operator = await loginAs(
        app,
        'operador@participantes.test',
        password,
      );
      await request(server()).get('/api/auth/me').set(operator).expect(200);

      await request(server())
        .patch(`/api/users/${user.id}/active`)
        .set(admin)
        .send({ isActive: false })
        .expect(200);
      await request(server()).get('/api/auth/me').set(operator).expect(401);
    });

    it('un ADMIN no puede desactivarse a sí mismo', async () => {
      const me = await request(server())
        .get('/api/auth/me')
        .set(admin)
        .expect(200);
      await request(server())
        .patch(`/api/users/${(me.body as { id: string }).id}/active`)
        .set(admin)
        .send({ isActive: false })
        .expect(400);
    });
  });
});
