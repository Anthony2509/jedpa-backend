import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791500208142 implements MigrationInterface {
  name = 'InitialSchema1791500208142';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."audit_action" AS ENUM('CREATE', 'UPDATE', 'IMPORT', 'ACTIVATE', 'DEACTIVATE', 'STATUS_CHANGE', 'DOCUMENT_REVIEW', 'PRINT', 'REPRINT', 'DELIVER', 'DIPLOMA_PRINT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid, "action" "public"."audit_action" NOT NULL, "entity" character varying(50) NOT NULL, "entity_id" uuid, "participant_id" uuid, "changes" jsonb, "ip" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs"  ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a213a1f3a7c434aa00c551b26e" ON "audit_logs"  ("participant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_82edbc5f8a1821ff01b8b9c865" ON "audit_logs"  ("entity", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."participant_type_category" AS ENUM('REGULAR', 'SPECIAL')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."access_level" AS ENUM('TOTAL', 'PARTIAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "participant_types" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(100) NOT NULL, "category" "public"."participant_type_category" NOT NULL, "access_level" "public"."access_level", "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_78af60bb8fe53e6c4d973e2db78" UNIQUE ("code"), CONSTRAINT "PK_5c80ce455695ae67705b9008f40" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "macro_regions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(10) NOT NULL, "name" character varying(100) NOT NULL, "headquarters" character varying(100), "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_77f582ac6f37126c581815ed27a" UNIQUE ("code"), CONSTRAINT "PK_e344645640d9aae926d3564c609" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "sports" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(10) NOT NULL, "name" character varying(100) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_313bccb48017b1a9c6160f1cbca" UNIQUE ("code"), CONSTRAINT "UQ_838312bddf12c427e3f66657ff3" UNIQUE ("name"), CONSTRAINT "PK_4fa1063d368e1fd68ea63c7d860" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."delegation_gender" AS ENUM('D', 'V')`,
    );
    await queryRunner.query(
      `CREATE TABLE "delegations" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(30) NOT NULL, "macro_region_id" uuid NOT NULL, "sport_id" uuid NOT NULL, "category" character varying(1) NOT NULL, "gender" "public"."delegation_gender" NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_83f93fbddb90a21b3b041e5c7c3" UNIQUE ("code"), CONSTRAINT "UQ_677e07abb6bbd548aacb11a2bad" UNIQUE ("macro_region_id", "sport_id", "category", "gender"), CONSTRAINT "CHK_5608bd42d037718e0fbb20445f" CHECK ("category" ~ '^[A-Z]$'), CONSTRAINT "PK_01f9fbbc9b3bf52236a4e951b19" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."identity_document_type" AS ENUM('DNI', 'CE', 'PASAPORTE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."gender" AS ENUM('FEMALE', 'MALE')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."participant_status" AS ENUM('PENDING_DOCUMENTS', 'IN_REVIEW', 'OBSERVED', 'READY_TO_PRINT', 'PRINTED', 'DELIVERED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "participants" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "document_type" "public"."identity_document_type" NOT NULL, "document_number" character varying(20) NOT NULL, "first_names" character varying(100) NOT NULL, "paternal_last_name" character varying(100) NOT NULL, "maternal_last_name" character varying(100), "gender" "public"."gender", "birth_date" date, "participant_type_id" uuid NOT NULL, "delegation_id" uuid, "institution" character varying(150), "school_name" character varying(200), "school_modular_code" character varying(20), "ugel" character varying(100), "region" character varying(100), "province" character varying(100), "district" character varying(100), "phone" character varying(20), "email" character varying(150), "disability_type" character varying(100), "disability_class" character varying(100), "external_id" character varying(50), "external_delegate_id" character varying(50), "extra_data" jsonb, "status" "public"."participant_status" NOT NULL DEFAULT 'PENDING_DOCUMENTS', "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_ecad9f2fa5e88ffe7fa6acc0e32" UNIQUE ("document_type", "document_number"), CONSTRAINT "PK_1cda06c31eec1c95b3365a0283f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7726b74bd27832e83b3609c880" ON "participants"  ("participant_type_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_532c00ba696155b336ba79aef7" ON "participants"  ("delegation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_023c69a287000a4b6233b71e00" ON "participants"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(50) NOT NULL, "description" character varying(255), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "email" character varying(150) NOT NULL, "full_name" character varying(150) NOT NULL, "password_hash" character varying(100) NOT NULL, "role_id" uuid NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "last_login_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "credential_copies" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "participant_id" uuid NOT NULL, "copy_number" smallint NOT NULL, "verification_token" character varying(64) NOT NULL, "is_revoked" boolean NOT NULL DEFAULT false, "printed_at" TIMESTAMP WITH TIME ZONE NOT NULL, "printed_by_id" uuid NOT NULL, "reason" text, CONSTRAINT "UQ_ac67395172895aecc7f46e1f9c3" UNIQUE ("verification_token"), CONSTRAINT "UQ_c7027f0ab5866d09340772ec51a" UNIQUE ("participant_id", "copy_number"), CONSTRAINT "CHK_8618faee9bd543975b61ff988f" CHECK ("copy_number" BETWEEN 0 AND 3), CONSTRAINT "PK_4c504a4e47d15b24954ce42ebdb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95564d86fb6ebc4c115476f5cf" ON "credential_copies"  ("participant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "document_types" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "code" character varying(50) NOT NULL, "name" character varying(150) NOT NULL, "is_sensitive" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_5c46cecbae576329e689110cbb5" UNIQUE ("code"), CONSTRAINT "PK_d467d7eeb7c8ce216e90e8494aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "stored_files" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "provider" character varying(30) NOT NULL, "storage_key" character varying(255) NOT NULL, "original_name" character varying(255) NOT NULL, "mime_type" character varying(100) NOT NULL, "size_bytes" integer NOT NULL, "uploaded_by_id" uuid NOT NULL, CONSTRAINT "UQ_d876a11b7afb1d51658687cd302" UNIQUE ("storage_key"), CONSTRAINT "PK_5d5be862bf53851c1794b4adf4e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."document_status" AS ENUM('PENDING', 'APPROVED', 'OBSERVED', 'NOT_APPLICABLE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "participant_documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "participant_id" uuid NOT NULL, "document_type_id" uuid NOT NULL, "status" "public"."document_status" NOT NULL DEFAULT 'PENDING', "file_id" uuid, "observation" text, "reviewed_by_id" uuid, "reviewed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_65c4e6c42f5fd98a116c7c16b81" UNIQUE ("participant_id", "document_type_id"), CONSTRAINT "PK_5871acd7e4f2ad9e6d5403e230b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ba6b846081847ba6fe32df1f6" ON "participant_documents"  ("participant_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "delivery_places" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_114e8b58495394ca990469e4299" UNIQUE ("name"), CONSTRAINT "PK_2cf322ab1125af95117fce58829" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "deliveries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "credential_copy_id" uuid NOT NULL, "delivery_place_id" uuid NOT NULL, "delivered_at" TIMESTAMP WITH TIME ZONE NOT NULL, "delivered_by_id" uuid NOT NULL, "observation" text, CONSTRAINT "UQ_c5e31de6a5b2ed607f988aa386e" UNIQUE ("credential_copy_id"), CONSTRAINT "REL_c5e31de6a5b2ed607f988aa386" UNIQUE ("credential_copy_id"), CONSTRAINT "PK_a6ef225c5c5f0974e503bfb731f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "document_requirements" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "participant_type_id" uuid NOT NULL, "document_type_id" uuid NOT NULL, "is_required" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_3661de0bf29c7eb849925af2b1d" UNIQUE ("participant_type_id", "document_type_id"), CONSTRAINT "PK_21b28e7d53255a15274f676f4c1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "delegations" ADD CONSTRAINT "FK_fd11e6a5a6de18d1e263f0c4aa3" FOREIGN KEY ("macro_region_id") REFERENCES "macro_regions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "delegations" ADD CONSTRAINT "FK_c7482dbb12e702aa35a8ca4e0ce" FOREIGN KEY ("sport_id") REFERENCES "sports"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participants" ADD CONSTRAINT "FK_7726b74bd27832e83b3609c8805" FOREIGN KEY ("participant_type_id") REFERENCES "participant_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participants" ADD CONSTRAINT "FK_532c00ba696155b336ba79aef79" FOREIGN KEY ("delegation_id") REFERENCES "delegations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_copies" ADD CONSTRAINT "FK_95564d86fb6ebc4c115476f5cfc" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_copies" ADD CONSTRAINT "FK_6c55250e48947f58b946456eba7" FOREIGN KEY ("printed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stored_files" ADD CONSTRAINT "FK_aa2d3ee25c799163ed356b026fc" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant_documents" ADD CONSTRAINT "FK_6ba6b846081847ba6fe32df1f60" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant_documents" ADD CONSTRAINT "FK_765fb550dfa8728dc3e4d2b1151" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant_documents" ADD CONSTRAINT "FK_25cd6b6839d3b48682bc12a6ae3" FOREIGN KEY ("file_id") REFERENCES "stored_files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant_documents" ADD CONSTRAINT "FK_b703fc374100266ba84b14cc724" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD CONSTRAINT "FK_c5e31de6a5b2ed607f988aa386e" FOREIGN KEY ("credential_copy_id") REFERENCES "credential_copies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD CONSTRAINT "FK_64454fe2050e15fd45bad4ed26d" FOREIGN KEY ("delivery_place_id") REFERENCES "delivery_places"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" ADD CONSTRAINT "FK_9d76ae5ca56ff2aaa68733988b8" FOREIGN KEY ("delivered_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_requirements" ADD CONSTRAINT "FK_8447d075663de8b15cd1e3050be" FOREIGN KEY ("participant_type_id") REFERENCES "participant_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_requirements" ADD CONSTRAINT "FK_d086e86b99c8160d7f01e4bbe56" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "document_requirements" DROP CONSTRAINT "FK_d086e86b99c8160d7f01e4bbe56"`,
    );
    await queryRunner.query(
      `ALTER TABLE "document_requirements" DROP CONSTRAINT "FK_8447d075663de8b15cd1e3050be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP CONSTRAINT "FK_9d76ae5ca56ff2aaa68733988b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP CONSTRAINT "FK_64454fe2050e15fd45bad4ed26d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "deliveries" DROP CONSTRAINT "FK_c5e31de6a5b2ed607f988aa386e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant_documents" DROP CONSTRAINT "FK_b703fc374100266ba84b14cc724"`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant_documents" DROP CONSTRAINT "FK_25cd6b6839d3b48682bc12a6ae3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant_documents" DROP CONSTRAINT "FK_765fb550dfa8728dc3e4d2b1151"`,
    );
    await queryRunner.query(
      `ALTER TABLE "participant_documents" DROP CONSTRAINT "FK_6ba6b846081847ba6fe32df1f60"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stored_files" DROP CONSTRAINT "FK_aa2d3ee25c799163ed356b026fc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_copies" DROP CONSTRAINT "FK_6c55250e48947f58b946456eba7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credential_copies" DROP CONSTRAINT "FK_95564d86fb6ebc4c115476f5cfc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "participants" DROP CONSTRAINT "FK_532c00ba696155b336ba79aef79"`,
    );
    await queryRunner.query(
      `ALTER TABLE "participants" DROP CONSTRAINT "FK_7726b74bd27832e83b3609c8805"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delegations" DROP CONSTRAINT "FK_c7482dbb12e702aa35a8ca4e0ce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "delegations" DROP CONSTRAINT "FK_fd11e6a5a6de18d1e263f0c4aa3"`,
    );
    await queryRunner.query(`DROP TABLE "document_requirements"`);
    await queryRunner.query(`DROP TABLE "deliveries"`);
    await queryRunner.query(`DROP TABLE "delivery_places"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ba6b846081847ba6fe32df1f6"`,
    );
    await queryRunner.query(`DROP TABLE "participant_documents"`);
    await queryRunner.query(`DROP TYPE "public"."document_status"`);
    await queryRunner.query(`DROP TABLE "stored_files"`);
    await queryRunner.query(`DROP TABLE "document_types"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_95564d86fb6ebc4c115476f5cf"`,
    );
    await queryRunner.query(`DROP TABLE "credential_copies"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_023c69a287000a4b6233b71e00"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_532c00ba696155b336ba79aef7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7726b74bd27832e83b3609c880"`,
    );
    await queryRunner.query(`DROP TABLE "participants"`);
    await queryRunner.query(`DROP TYPE "public"."participant_status"`);
    await queryRunner.query(`DROP TYPE "public"."gender"`);
    await queryRunner.query(`DROP TYPE "public"."identity_document_type"`);
    await queryRunner.query(`DROP TABLE "delegations"`);
    await queryRunner.query(`DROP TYPE "public"."delegation_gender"`);
    await queryRunner.query(`DROP TABLE "sports"`);
    await queryRunner.query(`DROP TABLE "macro_regions"`);
    await queryRunner.query(`DROP TABLE "participant_types"`);
    await queryRunner.query(`DROP TYPE "public"."access_level"`);
    await queryRunner.query(`DROP TYPE "public"."participant_type_category"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_82edbc5f8a1821ff01b8b9c865"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2cd10fda8276bb995288acfbfb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a213a1f3a7c434aa00c551b26e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TYPE "public"."audit_action"`);
  }
}
