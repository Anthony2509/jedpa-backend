import { MigrationInterface, QueryRunner } from 'typeorm';

/** Nuevo tipo de acción auditada: acceso a archivos de participantes. */
export class AuditActionFileAccess1791505500000 implements MigrationInterface {
  name = 'AuditActionFileAccess1791505500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."audit_action" ADD VALUE IF NOT EXISTS 'FILE_ACCESS'`,
    );
  }

  public async down(): Promise<void> {
    // PostgreSQL no permite quitar valores de un enum; además la auditoría es
    // inmutable y puede contener registros FILE_ACCESS. Reversión no soportada.
  }
}
