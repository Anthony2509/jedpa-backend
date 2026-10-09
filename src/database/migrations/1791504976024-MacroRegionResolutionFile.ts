import { MigrationInterface, QueryRunner } from 'typeorm';

export class MacroRegionResolutionFile1791504976024 implements MigrationInterface {
  name = 'MacroRegionResolutionFile1791504976024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "macro_regions" ADD "resolution_file_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "macro_regions" ADD CONSTRAINT "FK_42256e1191af77f67f93f7cd0cb" FOREIGN KEY ("resolution_file_id") REFERENCES "stored_files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "macro_regions" DROP CONSTRAINT "FK_42256e1191af77f67f93f7cd0cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "macro_regions" DROP COLUMN "resolution_file_id"`,
    );
  }
}
