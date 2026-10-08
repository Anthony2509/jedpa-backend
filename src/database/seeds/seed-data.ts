import {
  AccessLevel,
  ParticipantTypeCategory,
} from '../../catalogs/participant-types/entities/participant-type.entity';
import { ROLES } from '../../common/constants/roles';

/** Datos iniciales confirmados por el cliente (docs/SPEC.md). Editables luego por ADMIN. */

export const ROLE_SEEDS = [
  {
    name: ROLES.ADMIN,
    description:
      'Administrador: acceso total, usuarios, catálogos, reportería completa y auditoría',
  },
  {
    name: ROLES.COORDINATOR,
    description:
      'Coordinador: participantes, credenciales especiales, diplomas y reportería básica',
  },
  {
    name: ROLES.OPERATOR,
    description:
      'Operador: participantes regulares (documentos, revisión, impresión) y diplomas',
  },
];

export const PARTICIPANT_TYPE_SEEDS = [
  {
    code: 'DEPORTISTA',
    name: 'Deportista',
    category: ParticipantTypeCategory.REGULAR,
    accessLevel: null,
  },
  {
    code: 'ACOMPANANTE',
    name: 'Acompañante',
    category: ParticipantTypeCategory.REGULAR,
    accessLevel: null,
  },
  {
    code: 'DELEGADO',
    name: 'Delegado',
    category: ParticipantTypeCategory.REGULAR,
    accessLevel: null,
  },
  {
    code: 'ENTRENADOR',
    name: 'Entrenador',
    category: ParticipantTypeCategory.REGULAR,
    accessLevel: null,
  },
  {
    code: 'MINEDU',
    name: 'MINEDU',
    category: ParticipantTypeCategory.SPECIAL,
    accessLevel: null,
  },
  {
    code: 'INVITADO',
    name: 'Invitado',
    category: ParticipantTypeCategory.SPECIAL,
    accessLevel: AccessLevel.PARTIAL,
  },
  {
    code: 'PROVEEDOR_TOTAL',
    name: 'Proveedor acceso total',
    category: ParticipantTypeCategory.SPECIAL,
    accessLevel: AccessLevel.TOTAL,
  },
  {
    code: 'PROVEEDOR_PARCIAL',
    name: 'Proveedor acceso parcial',
    category: ParticipantTypeCategory.SPECIAL,
    accessLevel: AccessLevel.PARTIAL,
  },
];

export const DOCUMENT_TYPE_SEEDS = [
  {
    code: 'RESOLUCION_DIRECTORAL',
    name: 'Resolución Directoral',
    isSensitive: false,
  },
  {
    code: 'DOCUMENTO_DESIGNACION',
    name: 'Documento de designación (docente)',
    isSensitive: false,
  },
  { code: 'DNI', name: 'Documento de identidad', isSensitive: false },
  { code: 'CERTIFICADO_MEDICO', name: 'Certificado médico', isSensitive: true },
  {
    code: 'CERTIFICADO_DISCAPACIDAD',
    name: 'Certificado de discapacidad',
    isSensitive: true,
  },
  { code: 'SEGURO', name: 'Seguro', isSensitive: false },
  {
    code: 'AUTORIZACION_NOTARIAL',
    name: 'Autorización notarial',
    isSensitive: false,
  },
  {
    code: 'RESPONSABILIDAD_PARTICIPACION',
    name: 'Anexo 2: Responsabilidad de participación',
    isSensitive: false,
  },
  {
    code: 'AUTORIZACION_USO_IMAGEN',
    name: 'Anexo 3: Autorización de uso de imagen',
    isSensitive: false,
  },
  {
    code: 'DDJJ_ENTRENADOR_DELEGADO',
    name: 'Anexo 6: DDJJ entrenador-delegado',
    isSensitive: false,
  },
  { code: 'FOTO', name: 'Foto', isSensitive: false },
];

/** Tabla "documentos obligatorios según perfil" del cliente. ACOMPANANTE pendiente (P1). */
export const DOCUMENT_REQUIREMENT_SEEDS: Record<string, string[]> = {
  DEPORTISTA: [
    'RESOLUCION_DIRECTORAL',
    'DNI',
    'CERTIFICADO_MEDICO',
    'SEGURO',
    'FOTO',
  ],
  DELEGADO: ['RESOLUCION_DIRECTORAL', 'DNI', 'FOTO'],
  ENTRENADOR: ['RESOLUCION_DIRECTORAL', 'DNI'],
};

export const MACRO_REGION_SEEDS = Array.from({ length: 8 }, (_, i) => ({
  code: `M${i + 1}`,
  name: `Macrorregión ${i + 1}`,
}));

/** Abreviaturas del Excel de referencia. Lista oficial 2026 pendiente (P12). */
export const SPORT_SEEDS = [
  { code: 'AJD', name: 'Ajedrez' },
  { code: 'ATL', name: 'Atletismo' },
  { code: 'BSQ', name: 'Básquet' },
  { code: 'FTB', name: 'Fútbol' },
  { code: 'FTS', name: 'Futsal' },
  { code: 'HAN', name: 'Handball' },
  { code: 'JUD', name: 'Judo' },
  { code: 'NAT', name: 'Natación' },
  { code: 'TNM', name: 'Tenis de mesa' },
  { code: 'VOL', name: 'Vóley' },
];

export const DELIVERY_PLACE_SEEDS = [
  'Local Bros, Magdalena',
  'IEE Melitón Carvajal, Lince',
  'Villa Panamericana, VES',
  'Sede competencia – Videna, San Luis',
  'Sede competencia – IE Ricardo Palma, Surquillo',
  'Sede competencia – Polideportivo Luisa Fuentes, VES',
  'Sede competencia – Complejo Andrés Avelino Cáceres, VMT',
  'Sede competencia – Complejo Panamericano, San Miguel',
  'Sede competencia – CAR, Punta Rocas',
  'Sede competencia – Universidad de Lima, Ate',
  'Sede competencia – Coliseo FIA, La Molina',
].map((name) => ({ name }));
