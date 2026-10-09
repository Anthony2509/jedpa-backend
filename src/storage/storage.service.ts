import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { StoredFile } from './entities/stored-file.entity';
import { sanitizeFileName, validateUpload } from './file-validation';
import {
  AllowedMimeType,
  SignedUrl,
  STORAGE_DRIVER,
  type StorageDriver,
} from './storage.types';

/** Punto único de acceso a archivos: los módulos de negocio no conocen al proveedor. */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly maxBytes: number;
  private readonly ttlSeconds: number;

  constructor(
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
    config: ConfigService,
  ) {
    this.maxBytes = config.getOrThrow<number>('UPLOAD_MAX_BYTES');
    this.ttlSeconds = config.getOrThrow<number>('FILE_URL_TTL_SECONDS');
  }

  /**
   * Valida y sube el archivo, y registra sus metadatos con el EntityManager de la
   * transacción del caso de uso.
   */
  async store(
    manager: EntityManager,
    file: Express.Multer.File | undefined,
    allowed: AllowedMimeType[],
    uploadedById: string,
  ): Promise<StoredFile> {
    const mimeType = validateUpload(file, { allowed, maxBytes: this.maxBytes });
    const upload = file as Express.Multer.File;
    const { storageKey } = await this.put(upload.buffer, mimeType);
    const repo = manager.getRepository(StoredFile);
    return repo.save(
      repo.create({
        provider: this.driver.provider,
        storageKey,
        originalName: sanitizeFileName(upload.originalname),
        mimeType,
        sizeBytes: upload.size,
        uploadedById,
      }),
    );
  }

  /** Errores del proveedor: 503 claro, sin exponer detalles internos. */
  private async put(buffer: Buffer, mimeType: AllowedMimeType) {
    try {
      return await this.driver.put(buffer, mimeType);
    } catch (error) {
      this.logger.error(
        `Fallo al guardar en ${this.driver.provider}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException(
        'No se pudo guardar el archivo. Inténtelo nuevamente en unos minutos.',
      );
    }
  }

  /** Enlace temporal de solo lectura. */
  accessUrl(file: StoredFile): Promise<SignedUrl> {
    if (file.provider !== this.driver.provider) {
      throw new ConflictException(
        'El archivo está en otro proveedor de almacenamiento.',
      );
    }
    return this.driver.signedUrl(
      file.storageKey,
      file.mimeType as AllowedMimeType,
      this.ttlSeconds,
    );
  }
}
