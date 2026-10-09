import { randomUUID } from 'node:crypto';
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary';
import {
  AllowedMimeType,
  MIME_EXTENSIONS,
  SignedUrl,
  StorageDriver,
  StoredObject,
} from '../storage.types';

export interface CloudinaryOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

/** Cloudinary trata imágenes y PDF como recursos de tipo "image". */
const RESOURCE_TYPE = 'image';
/** "authenticated": el archivo nunca tiene URL pública. */
const DELIVERY_TYPE = 'authenticated';

/**
 * Archivos privados en Cloudinary. La lectura usa private_download_url: enlaces firmados
 * con expiración que funcionan aunque la cuenta tenga bloqueada la entrega de PDF.
 */
export class CloudinaryStorageDriver implements StorageDriver {
  readonly provider = 'cloudinary';

  constructor(private readonly options: CloudinaryOptions) {
    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: true,
    });
  }

  put(buffer: Buffer, mimeType: AllowedMimeType): Promise<StoredObject> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: RESOURCE_TYPE,
            type: DELIVERY_TYPE,
            folder: this.options.folder,
            public_id: randomUUID(),
            format: MIME_EXTENSIONS[mimeType],
            overwrite: false,
          },
          (error, result?: UploadApiResponse) => {
            if (error || !result) {
              reject(
                new Error(
                  `Cloudinary rechazó la subida: ${error?.message ?? 'sin respuesta'}`,
                ),
              );
              return;
            }
            resolve({ storageKey: result.public_id });
          },
        )
        .end(buffer);
    });
  }

  signedUrl(
    storageKey: string,
    mimeType: AllowedMimeType,
    ttlSeconds: number,
  ): Promise<SignedUrl> {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const url = cloudinary.utils.private_download_url(
      storageKey,
      MIME_EXTENSIONS[mimeType],
      {
        resource_type: RESOURCE_TYPE,
        type: DELIVERY_TYPE,
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        attachment: false,
      },
    );
    return Promise.resolve({ url, expiresAt });
  }
}
