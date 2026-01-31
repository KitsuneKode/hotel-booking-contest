/*
  Warnings:

  - You are about to drop the column `booking_date` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `cancelled_at` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `check_in_date` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `check_out_date` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `hotel_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `room_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `total_price` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `owner_id` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `total_reviews` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `booking_id` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `hotel_id` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `reviews` table. All the data in the column will be lost.
  - You are about to drop the column `hotel_id` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `max_occupancy` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `price_per_night` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `room_number` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `room_type` on the `rooms` table. All the data in the column will be lost.
  - You are about to drop the column `password_hash` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[bookingId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,bookingId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hotelId,roomNumber]` on the table `rooms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `checkInDate` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checkOutDate` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotelId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerId` to the `hotels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bookingId` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotelId` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `reviews` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotelId` to the `rooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxOccupancy` to the `rooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pricePerNight` to the `rooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomNumber` to the `rooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roomType` to the `rooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `passwordHash` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_hotel_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_room_id_fkey";

-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "hotels" DROP CONSTRAINT "hotels_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_hotel_id_fkey";

-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_user_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_hotel_id_fkey";

-- DropIndex
DROP INDEX "reviews_booking_id_key";

-- DropIndex
DROP INDEX "reviews_user_id_booking_id_key";

-- DropIndex
DROP INDEX "rooms_hotel_id_room_number_key";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "booking_date",
DROP COLUMN "cancelled_at",
DROP COLUMN "check_in_date",
DROP COLUMN "check_out_date",
DROP COLUMN "hotel_id",
DROP COLUMN "room_id",
DROP COLUMN "total_price",
DROP COLUMN "user_id",
ADD COLUMN     "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "checkInDate" DATE NOT NULL,
ADD COLUMN     "checkOutDate" DATE NOT NULL,
ADD COLUMN     "hotelId" TEXT NOT NULL,
ADD COLUMN     "roomId" TEXT NOT NULL,
ADD COLUMN     "totalPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "hotels" DROP COLUMN "owner_id",
DROP COLUMN "total_reviews",
ADD COLUMN     "ownerId" TEXT NOT NULL,
ADD COLUMN     "totalReviews" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "reviews" DROP COLUMN "booking_id",
DROP COLUMN "hotel_id",
DROP COLUMN "user_id",
ADD COLUMN     "bookingId" TEXT NOT NULL,
ADD COLUMN     "hotelId" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "rooms" DROP COLUMN "hotel_id",
DROP COLUMN "max_occupancy",
DROP COLUMN "price_per_night",
DROP COLUMN "room_number",
DROP COLUMN "room_type",
ADD COLUMN     "hotelId" TEXT NOT NULL,
ADD COLUMN     "maxOccupancy" INTEGER NOT NULL,
ADD COLUMN     "pricePerNight" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "roomNumber" VARCHAR(50) NOT NULL,
ADD COLUMN     "roomType" VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash",
ADD COLUMN     "passwordHash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reviews_bookingId_key" ON "reviews"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_bookingId_key" ON "reviews"("userId", "bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_hotelId_roomNumber_key" ON "rooms"("hotelId", "roomNumber");

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
