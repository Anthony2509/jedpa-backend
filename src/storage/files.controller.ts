import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { STORAGE_DRIVER, type StorageDriver } from './storage.types';

/**
 * Sirve archivos del almacenamiento LOCAL mediante enlaces firmados y temporales.
 * Público a propósito: el enlace firmado es la autorización (igual que en Cloudinary).
 */
@ApiExcludeController()
@Controller('files')
export class FilesController {
  constructor(@Inject(STORAGE_DRIVER) private readonly driver: StorageDriver) {}

  @Public()
  @Get(':token')
  async download(
    @Param('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    const file =
      this.driver instanceof LocalStorageDriver
        ? await this.driver.read(token)
        : null;
    if (!file) {
      throw new NotFoundException('El enlace no es válido o ha expirado.');
    }
    res
      .set({
        'Content-Type': file.mimeType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
      })
      .send(file.buffer);
  }
}
