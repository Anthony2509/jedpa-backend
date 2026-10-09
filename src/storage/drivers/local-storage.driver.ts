import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import {
  AllowedMimeType,
  MIME_EXTENSIONS,
  SignedUrl,
  StorageDriver,
  StoredObject,
} from '../storage.types';

interface LocalTokenPayload {
  k: string; // storageKey
  m: AllowedMimeType;
  e: number; // expiración (epoch en segundos)
}

/**
 * Almacenamiento en disco para desarrollo y pruebas. Emula los enlaces firmados de
 * Cloudinary: GET /api/files/:token con firma HMAC y expiración.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly provider = 'local';
  private readonly root: string;
  private readonly key: Buffer;

  constructor(
    rootDir: string,
    secret: string,
    private readonly publicApiUrl: string,
  ) {
    this.root = resolve(rootDir);
    this.key = createHmac('sha256', secret).update('jedpa-files').digest();
  }

  async put(buffer: Buffer, mimeType: AllowedMimeType): Promise<StoredObject> {
    const now = new Date();
    const storageKey = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${randomUUID()}.${MIME_EXTENSIONS[mimeType]}`,
    ].join('/');
    const path = this.pathFor(storageKey);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, buffer, { flag: 'wx' });
    return { storageKey };
  }

  get(storageKey: string): Promise<Buffer> {
    return readFile(this.pathFor(storageKey));
  }

  signedUrl(
    storageKey: string,
    mimeType: AllowedMimeType,
    ttlSeconds: number,
  ): Promise<SignedUrl> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const payload: LocalTokenPayload = {
      k: storageKey,
      m: mimeType,
      e: Math.floor(expiresAt.getTime() / 1000),
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${body}.${this.sign(body)}`;
    return Promise.resolve({
      url: `${this.publicApiUrl}/api/files/${token}`,
      expiresAt,
    });
  }

  /** Verifica firma y vigencia; devuelve el contenido o null si el enlace no es válido. */
  async read(
    token: string,
  ): Promise<{ buffer: Buffer; mimeType: AllowedMimeType } | null> {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expected = Buffer.from(this.sign(body));
    const received = Buffer.from(signature);
    if (
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      return null;
    }
    let payload: LocalTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(body, 'base64url').toString(),
      ) as LocalTokenPayload;
    } catch {
      return null;
    }
    if (payload.e * 1000 < Date.now()) return null;
    try {
      return {
        buffer: await readFile(this.pathFor(payload.k)),
        mimeType: payload.m,
      };
    } catch {
      return null;
    }
  }

  private sign(body: string): string {
    return createHmac('sha256', this.key).update(body).digest('base64url');
  }

  /** Ruta dentro de la raíz; rechaza intentos de salir de ella (../). */
  private pathFor(storageKey: string): string {
    const path = resolve(join(this.root, storageKey));
    if (!path.startsWith(this.root + sep)) {
      throw new Error('Ruta de archivo inválida.');
    }
    return path;
  }
}
