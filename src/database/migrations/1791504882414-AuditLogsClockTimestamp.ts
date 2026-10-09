import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditLogsClockTimestamp1791504882414 implements MigrationInterface {
  name = 'AuditLogsClockTimestamp1791504882414';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT clock_timestamp()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ALTER COLUMN "created_at" SET DEFAULT now()`,
    );
  }
}
