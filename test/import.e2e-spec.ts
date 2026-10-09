import ExcelJS from 'exceljs';
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

/** Mismo formato que el Excel del cliente: títulos arriba y encabezados en la fila 5. */
const HEADERS = [
  'N°',
  'MACROS',
  'SEDE',
  'REGIÓN / DEPARTAMENTO',
  'CAT.',
  'DISCIPLINA DEPORTIVA',
  'NOMENCLATURA DEPORTE',
  'GENERO',
  'DELEGACIÓN',
  'TIPO DOC',
  'DOCUMENTO\nDE IDENTIDAD',
  'ID PERSONAL SISTEMA MATEUS',
  'USUARIO',
  'PASSWORD',
  'APELLIDO PATERNO',
  'APELLIDO MATERNO',
  'NOMBRES',
  'CONDICIÓN ',
  'GÉNERO',
  'FECHA DE NACIMIENTO',
  'I.E.',
  'PRUEBA 1',
  'MARCA',
];

const SECRET = 'ClaveFiltrada!2024';

type Row = Partial<Record<(typeof HEADERS)[number], string | number | Date>>;

const person = (overrides: Row): Row => ({
  MACROS: 'M6',
  'CAT.': 'B',
  'NOMENCLATURA DEPORTE': 'JUD',
  GENERO: 'V',
  'TIPO DOC': 'DNI',
  USUARIO: 'usuario.mateus',
  PASSWORD: SECRET,
  'APELLIDO PATERNO': 'Importado',
  'APELLIDO MATERNO': 'Excel',
  NOMBRES: 'Pedro',
  'CONDICIÓN ': 'DEPORTISTA',
  GÉNERO: 'MASCULINO',
  'FECHA DE NACIMIENTO': new Date(Date.UTC(2011, 3, 9)),
  'I.E.': 'IE Judo Club',
  'PRUEBA 1': '-60 kg',
  ...overrides,
});

async function workbook(rows: Row[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Avance');
  const sheet = wb.addWorksheet('LISTA LIMPIA');
  sheet.getCell('B1').value = 'Control de impresión de documentos';
  sheet.getRow(5).values = HEADERS;
  rows.forEach((r, i) => {
    sheet.getRow(6 + i).values = HEADERS.map((h) => r[h] ?? '');
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('Importación del padrón desde Excel (e2e)', () => {
  let app: TestApp;
  let admin: Auth;
  let operator: Auth;
  const server = () => app.getHttpServer();

  const VALID: Row[] = [
    person({ 'DOCUMENTO\nDE IDENTIDAD': 5001 }), // Excel quitó los ceros: 00005001
    person({
      'DOCUMENTO\nDE IDENTIDAD': '50000002',
      NOMBRES: 'Luis',
      'CONDICIÓN ': 'DELEGADO',
    }),
    person({ 'DOCUMENTO\nDE IDENTIDAD': '50000003', NOMBRES: 'Ya Registrado' }),
  ];
  const INVALID: Row[] = [
    person({
      'DOCUMENTO\nDE IDENTIDAD': '50000004',
      'CONDICIÓN ': 'ENTRENADOR / DELEGADO',
    }),
    person({ 'DOCUMENTO\nDE IDENTIDAD': '50000002', NOMBRES: 'Repetido' }),
  ];

  beforeAll(async () => {
    app = await createTestApp();
    admin = await loginAs(app, E2E_ADMIN.email, E2E_ADMIN.password);
    const op = devUser('OPERADOR');
    operator = await loginAs(app, op.email, op.password);

    // Un participante que ya existe: la importación debe omitirlo.
    const macroRegionId = await catalogId(app, admin, 'macro-regions', 'M6');
    const sportId = await catalogId(app, admin, 'sports', 'JUD');
    const participantTypeId = await catalogId(
      app,
      admin,
      'participant-types',
      'DEPORTISTA',
    );
    const delegation = await request(server())
      .post('/api/delegations')
      .set(admin)
      .send({ macroRegionId, sportId, category: 'A', gender: 'V' })
      .expect(201);
    await request(server())
      .post('/api/participants')
      .set(admin)
      .send({
        documentType: 'DNI',
        documentNumber: '50000003',
        firstNames: 'Ya',
        paternalLastName: 'Registrado',
        gender: 'MALE',
        birthDate: '2011-01-01',
        participantTypeId,
        delegationId: (delegation.body as { id: string }).id,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  /** Recibe el Excel ya generado: devolver la petición desde una función async la ejecutaría. */
  const send = (path: string, file: Buffer, auth: Auth = admin) =>
    request(server()).post(path).set(auth).attach('file', file, 'padron.xlsx');

  it('solo ADMIN y COORDINADOR importan', async () => {
    await send(
      '/api/participants/import/preview',
      await workbook(VALID),
      operator,
    ).expect(403);
  });

  it('rechaza archivos que no son .xlsx', () =>
    request(server())
      .post('/api/participants/import/preview')
      .set(admin)
      .attach('file', Buffer.from('%PDF-1.4'), 'padron.pdf')
      .expect(400));

  it('la vista previa valida fila por fila sin guardar nada', async () => {
    const res = send(
      '/api/participants/import/preview',
      await workbook([...VALID, ...INVALID]),
    ).expect(200);
    const body = (await res).body as {
      sheet: string;
      totalRows: number;
      validRows: number;
      invalidRows: number;
      toCreate: number;
      alreadyRegistered: number;
      newDelegations: string[];
      errors: { row: number; errors: string[] }[];
    };
    expect(body).toMatchObject({
      sheet: 'LISTA LIMPIA',
      totalRows: 5,
      validRows: 3,
      invalidRows: 2,
      toCreate: 2,
      alreadyRegistered: 1,
      newDelegations: ['M6-JUD-B-V'],
    });
    expect(body.errors.map((e) => e.row)).toEqual([9, 10]);
    expect(body.errors[1].errors[0]).toContain('fila 7');

    const list = await request(server())
      .get('/api/participants')
      .query({ search: 'importado' })
      .set(admin)
      .expect(200);
    expect((list.body as { meta: { total: number } }).meta.total).toBe(0);
  });

  it('con una sola fila inválida no importa nada', async () => {
    const res = await send(
      '/api/participants/import',
      await workbook([...VALID, ...INVALID]),
    ).expect(400);
    expect((res.body as { message: string[] }).message[0]).toContain(
      'no se importó nada',
    );
  });

  it('importa en bloque, omite los ya registrados y crea las delegaciones', async () => {
    const res = await send(
      '/api/participants/import',
      await workbook(VALID),
    ).expect(201);
    expect(res.body).toEqual({
      created: 2,
      skippedExisting: 1,
      delegationsCreated: ['M6-JUD-B-V'],
    });

    const imported = await request(server())
      .get('/api/participants')
      .query({ search: '00005001' })
      .set(admin)
      .expect(200);
    const [participant] = (
      imported.body as {
        data: {
          id: string;
          status: string;
          delegation: { code: string };
          extraData: object;
        }[];
      }
    ).data;
    expect(participant).toMatchObject({
      status: 'PENDING_DOCUMENTS',
      delegation: { code: 'M6-JUD-B-V' },
      extraData: { prueba1: '-60 kg' },
    });

    const audit = await request(server())
      .get('/api/audit-logs')
      .query({ participantId: participant.id, action: 'IMPORT' })
      .set(admin)
      .expect(200);
    expect((audit.body as { meta: { total: number } }).meta.total).toBe(1);
  });

  it('las columnas USUARIO y PASSWORD nunca se guardan', async () => {
    const audit = await request(server())
      .get('/api/audit-logs')
      .query({ action: 'IMPORT', limit: 100 })
      .set(admin)
      .expect(200);
    const participants = await request(server())
      .get('/api/participants')
      .query({ search: 'importado', limit: 100 })
      .set(admin)
      .expect(200);
    const everything = JSON.stringify([audit.body, participants.body]);
    expect(everything).not.toContain(SECRET);
    expect(everything).not.toContain('usuario.mateus');
  });

  it('reimportar el mismo archivo no duplica: todos quedan como ya registrados', async () => {
    const res = await send(
      '/api/participants/import',
      await workbook(VALID),
    ).expect(201);
    expect(res.body).toMatchObject({ created: 0, skippedExisting: 3 });
  });
});
