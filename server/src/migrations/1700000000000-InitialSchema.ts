import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем расширение для UUID
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Создаем таблицу users
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "telegramId" character varying(64) NOT NULL UNIQUE,
        "username" character varying(32),
        "firstName" character varying(64),
        "lastName" character varying(64),
        "avatar" character varying(512),
        "balance" decimal(12,2) NOT NULL DEFAULT 100,
        "walletAddress" character varying(255),
        "totalDeposit" decimal(12,2) NOT NULL DEFAULT 0,
        "refBalance" decimal(12,2) NOT NULL DEFAULT 0,
        "refBonus" decimal(5,2) NOT NULL DEFAULT 0,
        "referrerId" uuid,
        "currentRoomRoomId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Создаем таблицу admins
    await queryRunner.query(`
      CREATE TABLE "admins" (
        "id" SERIAL PRIMARY KEY,
        "telegramId" character varying NOT NULL UNIQUE,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Создаем таблицу transactions
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "type" character varying(16) NOT NULL CHECK (type IN ('deposit', 'withdraw')),
        "currency" character varying(16) NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'failed', 'complete')),
        "address" character varying(128) NOT NULL,
        "tracker_id" character varying(128) NOT NULL UNIQUE,
        "client_transaction_id" character varying(36),
        "transaction_hash" character varying(128),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Создаем таблицу rooms
    await queryRunner.query(`
      CREATE TABLE "rooms" (
        "id" SERIAL PRIMARY KEY,
        "roomId" character varying NOT NULL UNIQUE,
        "minBet" double precision NOT NULL,
        "type" character varying NOT NULL,
        "password" character varying,
        "status" character varying NOT NULL DEFAULT 'waiting',
        "maxPlayers" integer NOT NULL DEFAULT 6,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Создаем индексы
    await queryRunner.query(
      `CREATE INDEX "IDX_users_telegramId" ON "users" ("telegramId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_tracker_id" ON "transactions" ("tracker_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_userId" ON "transactions" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rooms_roomId" ON "rooms" ("roomId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_rooms_type" ON "rooms" ("type")`,
    );

    // Создаем foreign key для referrerId
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "FK_users_referrer" 
      FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Создаем foreign key для userId в transactions
    await queryRunner.query(`
      ALTER TABLE "transactions" 
      ADD CONSTRAINT "FK_transactions_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем foreign key для transactions
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT "FK_transactions_user"`,
    );

    // Удаляем foreign key для users
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_users_referrer"`,
    );

    // Удаляем индексы
    await queryRunner.query(`DROP INDEX "IDX_rooms_type"`);
    await queryRunner.query(`DROP INDEX "IDX_rooms_roomId"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_userId"`);
    await queryRunner.query(`DROP INDEX "IDX_transactions_tracker_id"`);
    await queryRunner.query(`DROP INDEX "IDX_users_telegramId"`);

    // Удаляем таблицы
    await queryRunner.query(`DROP TABLE "rooms"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "admins"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Удаляем расширение UUID
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}
