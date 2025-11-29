import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsSystemToRooms1700000000001 implements MigrationInterface {
  name = 'AddIsSystemToRooms1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "rooms" ADD "isSystem" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "rooms" DROP COLUMN "isSystem"`);
  }
}
