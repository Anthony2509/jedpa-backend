import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

/**
 * Subidas en memoria con el límite UPLOAD_MAX_BYTES: el archivo se valida y se envía
 * al proveedor sin tocar el disco del servidor.
 */
@Module({
  imports: [
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize: config.getOrThrow<number>('UPLOAD_MAX_BYTES'),
          files: 1,
        },
      }),
    }),
  ],
  exports: [MulterModule],
})
export class UploadModule {}
