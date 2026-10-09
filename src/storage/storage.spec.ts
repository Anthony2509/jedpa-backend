import { BadRequestException } from '@nestjs/common';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStorageDriver } from './drivers/local-storage.driver';
import {
  detectMimeType,
  sanitizeFileName,
  validateUpload,
} from './file-validation';

const PDF = Buffer.from('%PDF-1.7\n...');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]);

const upload = (buffer: Buffer, originalname = 'doc.pdf') =>
  ({ buffer, size: buffer.length, originalname }) as Express.Multer.File;

describe('file-validation', () => {
  it('detecta el tipo real por los primeros bytes', () => {
    expect(detectMimeType(PDF)).toBe('application/pdf');
    expect(detectMimeType(PNG)).toBe('image/png');
    expect(detectMimeType(JPG)).toBe('image/jpeg');
    expect(detectMimeType(Buffer.from('MZ ejecutable'))).toBeNull();
  });

  it('rechaza un ejecutable aunque se llame .pdf', () => {
    expect(() =>
      validateUpload(upload(Buffer.from('MZ...'), 'virus.pdf'), {
        allowed: ['application/pdf'],
        maxBytes: 1024,
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza un tipo válido pero no admitido para ese documento', () => {
    expect(() =>
      validateUpload(upload(PDF), { allowed: ['image/jpeg'], maxBytes: 1024 }),
    ).toThrow('Se aceptan: JPG');
  });

  it('rechaza archivos vacíos o demasiado grandes', () => {
    const rules = { allowed: ['application/pdf' as const], maxBytes: 4 };
    expect(() => validateUpload(undefined, rules)).toThrow(BadRequestException);
    expect(() => validateUpload(upload(PDF), rules)).toThrow('máximo');
  });

  it('limpia el nombre original', () => {
    expect(sanitizeFileName('C:\\fakepath\\..\\cert"médico".pdf')).toBe(
      'certmédico.pdf',
    );
  });
});

describe('LocalStorageDriver', () => {
  let dir: string;
  let driver: LocalStorageDriver;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'jedpa-storage-'));
    driver = new LocalStorageDriver(dir, 's'.repeat(40), 'http://api');
  });

  afterEach(() => rm(dir, { recursive: true, force: true }));

  it('guarda y sirve el archivo con un enlace firmado vigente', async () => {
    const { storageKey } = await driver.put(PDF, 'application/pdf');
    const { url } = await driver.signedUrl(storageKey, 'application/pdf', 60);
    const token = url.split('/api/files/')[1];
    const file = await driver.read(token);
    expect(file?.buffer.equals(PDF)).toBe(true);
    expect(file?.mimeType).toBe('application/pdf');
  });

  it('rechaza enlaces manipulados o vencidos', async () => {
    const { storageKey } = await driver.put(PDF, 'application/pdf');
    const valid = (
      await driver.signedUrl(storageKey, 'application/pdf', 60)
    ).url.split('/api/files/')[1];
    const expired = (
      await driver.signedUrl(storageKey, 'application/pdf', -1)
    ).url.split('/api/files/')[1];
    const [body, signature] = valid.split('.');
    const forged = `${Buffer.from(JSON.stringify({ k: '../../.env', m: 'application/pdf', e: 9e9 })).toString('base64url')}.${signature}`;

    expect(await driver.read(`${body}.x${signature}`)).toBeNull();
    expect(await driver.read(expired)).toBeNull();
    expect(await driver.read(forged)).toBeNull();
  });
});
