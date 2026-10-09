import { buildDelegationCode } from '../../delegations/delegation-code';
import { DelegationGender } from '../../delegations/entities/delegation.entity';
import {
  Gender,
  IDENTITY_DOCUMENT_PATTERNS,
  IdentityDocumentType,
} from '../enums';
import { normalizeHeader, RawRow } from './excel-reader';

/**
 * Mapeo de columnas del Excel del cliente (hoja LISTA LIMPIA) a campos del sistema.
 * Las claves están normalizadas (mayúsculas, sin tildes).
 */
export const COLUMNS = {
  macro: 'MACROS',
  category: 'CAT.',
  sport: 'NOMENCLATURA DEPORTE',
  /** D (damas) / V (varones): primera columna GÉNERO del Excel. */
  delegationGender: 'GENERO',
  documentType: 'TIPO DOC',
  documentNumber: 'DOCUMENTO DE IDENTIDAD',
  externalId: 'ID PERSONAL SISTEMA MATEUS',
  externalDelegateId: 'ID DE SU DELEGADO SISTEMA MATEUS',
  paternalLastName: 'APELLIDO PATERNO',
  maternalLastName: 'APELLIDO MATERNO',
  firstNames: 'NOMBRES',
  condition: 'CONDICION',
  /** FEMENINO / MASCULINO: segunda columna GÉNERO del Excel. */
  gender: 'GENERO_2',
  birthDate: 'FECHA DE NACIMIENTO',
  schoolModularCode: 'COD_MOD',
  schoolName: 'I.E.',
  ugel: 'UGEL',
  region: 'REGION / DEPARTAMENTO',
  province: 'PROVINCIA',
  district: 'DISTRITO',
  phone: 'CELULAR',
  email: 'CORREO ELECTRONICO',
  disabilityType: 'TIPO DE DISCAPACIDAD',
  disabilityClass: 'CLASE DE DISCAPACIDAD',
} as const;

/** Pruebas y marcas: van a extraData. */
const EXTRA_COLUMNS = [
  ['PRUEBA 1', 'prueba1'],
  ['MARCA', 'marca1'],
  ['PRUEBA 2', 'prueba2'],
  ['MARCA2', 'marca2'],
  ['PRUEBA 3', 'prueba3'],
  ['MARCA3', 'marca3'],
  ['PRUEBA 4', 'prueba4'],
  ['MARCA4', 'marca4'],
] as const;

/**
 * CONDICIÓN del Excel → código de tipo de participante.
 * "ENTRENADOR / DELEGADO" y "COORDINADOR DE DELEGACIÓN" quedan SIN mapear a
 * propósito: pendiente de confirmar con el cliente (PREGUNTAS-CLIENTE 1.2).
 */
export const CONDITION_TO_TYPE: Record<string, string> = {
  DEPORTISTA: 'DEPORTISTA',
  DELEGADO: 'DELEGADO',
  ENTRENADOR: 'ENTRENADOR',
  ACOMPANANTE: 'ACOMPANANTE',
};

const DOCUMENT_TYPES: Record<string, IdentityDocumentType> = {
  DNI: IdentityDocumentType.DNI,
  CE: IdentityDocumentType.CE,
  'CARNET DE EXTRANJERIA': IdentityDocumentType.CE,
  PASAPORTE: IdentityDocumentType.PASAPORTE,
  PAS: IdentityDocumentType.PASAPORTE,
};

const GENDERS: Record<string, Gender> = {
  FEMENINO: Gender.FEMALE,
  MASCULINO: Gender.MALE,
  F: Gender.FEMALE,
  M: Gender.MALE,
};

/** Valores "vacíos" que el Excel usa como relleno. */
const EMPTY = new Set(['', '0', 'NULL', 'SELECCIONAR', '-']);

export interface ImportCatalogs {
  /** código → id */
  macroRegions: Map<string, string>;
  sports: Map<string, string>;
  participantTypes: Map<string, string>;
}

export interface ParsedParticipant {
  documentType: IdentityDocumentType;
  documentNumber: string;
  firstNames: string;
  paternalLastName: string;
  maternalLastName: string | null;
  gender: Gender | null;
  birthDate: string | null;
  participantTypeId: string;
  participantTypeCode: string;
  delegation: {
    code: string;
    macroRegionId: string;
    sportId: string;
    category: string;
    gender: DelegationGender;
  } | null;
  schoolName: string | null;
  schoolModularCode: string | null;
  ugel: string | null;
  region: string | null;
  province: string | null;
  district: string | null;
  phone: string | null;
  email: string | null;
  disabilityType: string | null;
  disabilityClass: string | null;
  externalId: string | null;
  externalDelegateId: string | null;
  extraData: Record<string, string> | null;
}

export type ParseResult =
  | { ok: true; row: number; data: ParsedParticipant }
  | { ok: false; row: number; errors: string[] };

const clean = (value: string | undefined): string | null => {
  const text = (value ?? '').replace(/\s+/g, ' ').trim();
  return EMPTY.has(normalizeHeader(text)) ? null : text;
};

const limit = (value: string | null, max: number) =>
  value ? value.slice(0, max) : null;

/** dd/mm/aaaa, aaaa-mm-dd o fecha de Excel ya convertida → aaaa-mm-dd. */
export function parseDate(value: string | null): string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const [y, m, d] = iso
    ? [iso[1], iso[2], iso[3]]
    : dmy
      ? [dmy[3], dmy[2].padStart(2, '0'), dmy[1].padStart(2, '0')]
      : [];
  if (!y) return null;
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  const valid =
    !Number.isNaN(date.getTime()) &&
    date.getUTCDate() === Number(d) &&
    Number(y) >= 1900 &&
    date <= new Date();
  return valid ? `${y}-${m}-${d}` : null;
}

/** Convierte y valida una fila. Función pura: no consulta la base de datos. */
export function parseRow(raw: RawRow, catalogs: ImportCatalogs): ParseResult {
  const v = raw.values;
  const errors: string[] = [];

  // Documento de identidad (Excel elimina los ceros a la izquierda del DNI).
  const docKey = normalizeHeader(v[COLUMNS.documentType] ?? '');
  const documentType = DOCUMENT_TYPES[docKey];
  let documentNumber = (v[COLUMNS.documentNumber] ?? '')
    .replace(/\s/g, '')
    .toUpperCase();
  if (!documentType) {
    errors.push(
      `Tipo de documento no reconocido: "${v[COLUMNS.documentType] ?? ''}".`,
    );
  } else {
    if (
      documentType === IdentityDocumentType.DNI &&
      /^\d{1,7}$/.test(documentNumber)
    ) {
      documentNumber = documentNumber.padStart(8, '0');
    }
    if (!IDENTITY_DOCUMENT_PATTERNS[documentType].test(documentNumber)) {
      errors.push(`Número de ${documentType} inválido.`);
    }
  }

  const firstNames = clean(v[COLUMNS.firstNames]);
  const paternalLastName = clean(v[COLUMNS.paternalLastName]);
  if (!firstNames) errors.push('Faltan los nombres.');
  if (!paternalLastName) errors.push('Falta el apellido paterno.');

  // Tipo de participante.
  const condition = normalizeHeader(v[COLUMNS.condition] ?? '');
  const typeCode = CONDITION_TO_TYPE[condition];
  const participantTypeId = typeCode
    ? catalogs.participantTypes.get(typeCode)
    : undefined;
  if (!participantTypeId) {
    errors.push(
      `Condición "${v[COLUMNS.condition] ?? ''}" sin tipo de participante definido (pendiente con el cliente).`,
    );
  }

  const personGender =
    GENDERS[normalizeHeader(v[COLUMNS.gender] ?? '')] ?? null;
  const birthDate = parseDate(clean(v[COLUMNS.birthDate]));
  if (!personGender)
    errors.push('Género no reconocido (FEMENINO o MASCULINO).');
  if (!birthDate) errors.push('Fecha de nacimiento ausente o inválida.');

  // Delegación: macrorregión + disciplina + categoría + género (D/V).
  const macro = normalizeHeader(v[COLUMNS.macro] ?? '');
  const sport = normalizeHeader(v[COLUMNS.sport] ?? '');
  const category = normalizeHeader(v[COLUMNS.category] ?? '');
  const delegationGender = normalizeHeader(v[COLUMNS.delegationGender] ?? '');
  const macroRegionId = catalogs.macroRegions.get(macro);
  const sportId = catalogs.sports.get(sport);
  if (!macroRegionId) errors.push(`Macrorregión "${macro}" no existe.`);
  if (!sportId) errors.push(`Disciplina "${sport}" no existe en el catálogo.`);
  if (!/^[A-Z]$/.test(category))
    errors.push(`Categoría "${category}" inválida.`);
  if (delegationGender !== 'D' && delegationGender !== 'V') {
    errors.push(
      `Género de la delegación "${delegationGender}" inválido (D o V).`,
    );
  }

  if (
    errors.length ||
    !documentType ||
    !participantTypeId ||
    !macroRegionId ||
    !sportId
  ) {
    return { ok: false, row: raw.row, errors };
  }

  const extra = Object.fromEntries(
    EXTRA_COLUMNS.map(([column, key]) => [key, clean(v[column])]).filter(
      ([, value]) => value,
    ),
  ) as Record<string, string>;

  return {
    ok: true,
    row: raw.row,
    data: {
      documentType,
      documentNumber,
      firstNames: limit(firstNames, 100)!,
      paternalLastName: limit(paternalLastName, 100)!,
      maternalLastName: limit(clean(v[COLUMNS.maternalLastName]), 100),
      gender: personGender,
      birthDate,
      participantTypeId,
      participantTypeCode: typeCode,
      delegation: {
        code: buildDelegationCode({
          macroCode: macro,
          sportCode: sport,
          category,
          gender: delegationGender,
        }),
        macroRegionId,
        sportId,
        category,
        gender: delegationGender as DelegationGender,
      },
      schoolName: limit(clean(v[COLUMNS.schoolName]), 200),
      schoolModularCode: limit(clean(v[COLUMNS.schoolModularCode]), 20),
      ugel: limit(clean(v[COLUMNS.ugel]), 100),
      region: limit(clean(v[COLUMNS.region]), 100),
      province: limit(clean(v[COLUMNS.province]), 100),
      district: limit(clean(v[COLUMNS.district]), 100),
      phone: limit(clean(v[COLUMNS.phone]), 20),
      email: limit(clean(v[COLUMNS.email])?.toLowerCase() ?? null, 150),
      disabilityType: limit(clean(v[COLUMNS.disabilityType]), 100),
      disabilityClass: limit(clean(v[COLUMNS.disabilityClass]), 100),
      externalId: limit(clean(v[COLUMNS.externalId]), 50),
      externalDelegateId: limit(clean(v[COLUMNS.externalDelegateId]), 50),
      extraData: Object.keys(extra).length ? extra : null,
    },
  };
}
