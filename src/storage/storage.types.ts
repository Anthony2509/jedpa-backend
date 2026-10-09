/** Tipos de archivo admitidos, detectados por su contenido (no por la extensión). */
export type AllowedMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export const MIME_EXTENSIONS: Record<AllowedMimeType, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

export interface StoredObject {
  /** Identificador del archivo en el proveedor (ruta local o public_id). */
  storageKey: string;
}

export interface SignedUrl {
  url: string;
  expiresAt: Date;
}

/** Contrato de un proveedor de almacenamiento. Los archivos nunca son públicos. */
export interface StorageDriver {
  readonly provider: string;
  put(buffer: Buffer, mimeType: AllowedMimeType): Promise<StoredObject>;
  /** Enlace temporal de solo lectura. */
  signedUrl(
    storageKey: string,
    mimeType: AllowedMimeType,
    ttlSeconds: number,
  ): Promise<SignedUrl>;
}

export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');
