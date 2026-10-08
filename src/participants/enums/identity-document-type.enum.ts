/** Tipo de documento de identidad ("DNI / CE / Pas." en la credencial). */
export enum IdentityDocumentType {
  DNI = 'DNI',
  CE = 'CE',
  PASAPORTE = 'PASAPORTE',
}

/** Formato válido del número según el tipo de documento. */
export const IDENTITY_DOCUMENT_PATTERNS: Record<IdentityDocumentType, RegExp> =
  {
    [IdentityDocumentType.DNI]: /^\d{8}$/,
    [IdentityDocumentType.CE]: /^[A-Za-z0-9]{6,12}$/,
    [IdentityDocumentType.PASAPORTE]: /^[A-Za-z0-9]{6,12}$/,
  };
