import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryStorageDriver } from './drivers/cloudinary-storage.driver';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import { StoredFile } from './entities/stored-file.entity';
import { FilesController } from './files.controller';
import { StorageService } from './storage.service';
import { STORAGE_DRIVER, StorageDriver } from './storage.types';

const storageDriverFactory = (config: ConfigService): StorageDriver =>
  config.getOrThrow<string>('STORAGE_DRIVER') === 'cloudinary'
    ? new CloudinaryStorageDriver({
        cloudName: config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
        apiKey: config.getOrThrow<string>('CLOUDINARY_API_KEY'),
        apiSecret: config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
        folder: config.getOrThrow<string>('CLOUDINARY_FOLDER'),
      })
    : new LocalStorageDriver(
        config.getOrThrow<string>('STORAGE_LOCAL_DIR'),
        config.getOrThrow<string>('JWT_SECRET'),
        config.getOrThrow<string>('API_PUBLIC_URL'),
      );

@Module({
  imports: [TypeOrmModule.forFeature([StoredFile])],
  controllers: [FilesController],
  providers: [
    {
      provide: STORAGE_DRIVER,
      inject: [ConfigService],
      useFactory: storageDriverFactory,
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
