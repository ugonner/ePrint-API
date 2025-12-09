import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1765296135673 implements MigrationInterface {
    name = 'Migrations1765296135673'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "app_version" (
                "id" SERIAL NOT NULL,
                "detail" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "isDeleted" boolean NOT NULL DEFAULT false,
                CONSTRAINT "PK_f2573b981a7eac664875e7483ac" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "app_version"
        `);
    }

}
