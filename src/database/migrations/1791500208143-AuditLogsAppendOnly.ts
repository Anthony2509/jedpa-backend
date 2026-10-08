import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La auditoría es de solo inserción: ningún UPDATE, DELETE ni TRUNCATE
 * puede alterarla, ni desde la aplicación ni con acceso directo a la base.
 */
export class AuditLogsAppendOnly1791500208143 implements MigrationInterface {
  name = 'AuditLogsAppendOnly1791500208143';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION audit_logs_block_changes() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs es de solo inserción: % no permitido', TG_OP;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_no_update_delete
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION audit_logs_block_changes()
    `);
    await queryRunner.query(`
      CREATE TRIGGER audit_logs_no_truncate
      BEFORE TRUNCATE ON "audit_logs"
      FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_block_changes()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS audit_logs_no_truncate ON "audit_logs"`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS audit_logs_no_update_delete ON "audit_logs"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS audit_logs_block_changes`);
  }
}
