import { MigrationInterface, QueryRunner } from 'typeorm';

/** Búsqueda sin tildes: "perez" encuentra "Pérez". */
export class UnaccentExtension1791500208144 implements MigrationInterface {
  name = 'UnaccentExtension1791500208144';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP EXTENSION IF EXISTS unaccent`);
  }
}
