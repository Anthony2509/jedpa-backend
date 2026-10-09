import { BadRequestException } from '@nestjs/common';
import { AllowedMimeType, MIME_EXTENSIONS } from './storage.types';

const SIGNATURES: { mime: AllowedMimeType; bytes: number[] }[] = [
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  {
    mime: 'image/png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
];

/** Tipo real del archivo según sus primeros bytes, o null si no es admitido. */
export function detectMimeType(buffer: Buffer): AllowedMimeType | null {
  const match = SIGNATURES.find(({ bytes }) =>
    bytes.every((byte, i) => buffer[i] === byte),
  );
  return match?.mime ?? null;
}

export interface UploadRules {
  allowed: AllowedMimeType[];
  maxBytes: number;
}

/** Valida presencia, tamaño y tipo real. Devuelve el tipo detectado. */
export function validateUpload(
  file: Express.Multer.File | undefined,
  { allowed, maxBytes }: UploadRules,
): AllowedMimeType {
  if (!file?.buffer?.length) {
    throw new BadRequestException(
      'Debe adjuntar un archivo en el campo "file".',
    );
  }
  if (file.size > maxBytes) {
    const mb = (maxBytes / 1024 / 1024).toFixed(0);
    throw new BadRequestException(`El archivo supera el máximo de ${mb} MB.`);
  }
  const mime = detectMimeType(file.buffer);
  if (!mime || !allowed.includes(mime)) {
    const formats = allowed.map((m) => MIME_EXTENSIONS[m].toUpperCase());
    throw new BadRequestException(
      `Formato no permitido. Se aceptan: ${formats.join(', ')}.`,
    );
  }
  return mime;
}

/** Nombre original seguro para guardar y mostrar (sin rutas ni caracteres de control). */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'archivo';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f"<>|*?:]/g, '').trim();
  return (clean || 'archivo').slice(0, 200);
}
