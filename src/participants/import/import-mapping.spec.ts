import { IdentityDocumentType } from '../enums';
import { RawRow } from './excel-reader';
import { ImportCatalogs, parseDate, parseRow } from './import-mapping';

const catalogs: ImportCatalogs = {
  macroRegions: new Map([['M1', 'macro-1']]),
  sports: new Map([['AJD', 'sport-ajd']]),
  participantTypes: new Map([
    ['DEPORTISTA', 'type-dep'],
    ['DELEGADO', 'type-del'],
  ]),
};

const row = (values: Record<string, string>): RawRow => ({
  row: 6,
  values: {
    MACROS: 'M1',
    'CAT.': 'B',
    'NOMENCLATURA DEPORTE': 'AJD',
    GENERO: 'D',
    'TIPO DOC': 'DNI',
    'DOCUMENTO DE IDENTIDAD': '7342',
    'APELLIDO PATERNO': 'Pérez',
    'APELLIDO MATERNO': 'Quispe',
    NOMBRES: 'Ana',
    CONDICION: 'DEPORTISTA',
    GENERO_2: 'FEMENINO',
    'FECHA DE NACIMIENTO': '2012-05-20',
    'PRUEBA 1': '100 m planos',
    MARCA: '12.5',
    'PRUEBA 2': 'Seleccionar',
    ...values,
  },
});

describe('import-mapping', () => {
  it('convierte una fila válida y completa los ceros del DNI', () => {
    const result = parseRow(row({}), catalogs);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({
      documentType: IdentityDocumentType.DNI,
      documentNumber: '00007342',
      gender: 'FEMALE',
      birthDate: '2012-05-20',
      participantTypeCode: 'DEPORTISTA',
      delegation: { code: 'M1-AJD-B-D', category: 'B', gender: 'D' },
      extraData: { prueba1: '100 m planos', marca1: '12.5' },
    });
  });

  it('no adivina condiciones pendientes con el cliente', () => {
    const result = parseRow(
      row({ CONDICION: 'ENTRENADOR / DELEGADO' }),
      catalogs,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain('pendiente con el cliente');
  });

  it('acumula todos los errores de la fila', () => {
    const result = parseRow(
      row({
        'TIPO DOC': 'CE',
        'DOCUMENTO DE IDENTIDAD': '12',
        NOMBRES: '',
        'NOMENCLATURA DEPORTE': 'PAT',
        'CAT.': '0',
        GENERO: '0',
      }),
      catalogs,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Número de CE inválido.',
        'Faltan los nombres.',
        'Disciplina "PAT" no existe en el catálogo.',
      ]),
    );
  });

  it.each([
    ['2012-05-20', '2012-05-20'],
    ['20/05/2012', '2012-05-20'],
    ['5/1/2012', '2012-01-05'],
    ['31/02/2012', null],
    ['2999-01-01', null],
    ['NULL', null],
  ])('parseDate(%s) → %s', (input, expected) => {
    expect(parseDate(input)).toBe(expected);
  });
});
