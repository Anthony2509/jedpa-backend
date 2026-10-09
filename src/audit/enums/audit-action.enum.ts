export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  IMPORT = 'IMPORT',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  DOCUMENT_REVIEW = 'DOCUMENT_REVIEW',
  PRINT = 'PRINT',
  REPRINT = 'REPRINT',
  DELIVER = 'DELIVER',
  DIPLOMA_PRINT = 'DIPLOMA_PRINT',
  /** Emisión de un enlace temporal a un archivo (documentos de menores). */
  FILE_ACCESS = 'FILE_ACCESS',
}
