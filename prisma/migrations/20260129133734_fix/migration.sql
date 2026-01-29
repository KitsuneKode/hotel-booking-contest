-- DropIndex
DROP INDEX "rooms_hotel_id_key";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'customer',
ALTER COLUMN "phone" DROP NOT NULL;
