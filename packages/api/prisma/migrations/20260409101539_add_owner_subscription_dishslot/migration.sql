/*
  Warnings:

  - You are about to drop the column `clerkOrgId` on the `Restaurant` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Restaurant` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('pending', 'active', 'halted', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "PaymentEventType" AS ENUM ('subscription_activated', 'subscription_charged', 'subscription_halted', 'subscription_cancelled', 'subscription_completed', 'payment_failed');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('empty', 'photos_uploaded', 'processing', 'glb_ready');

-- AlterTable
ALTER TABLE "Restaurant" DROP COLUMN "clerkOrgId",
ADD COLUMN     "qrKey" TEXT,
ADD COLUMN     "qrUrl" TEXT,
ADD COLUMN     "scanCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Remove default after backfill (Prisma manages updatedAt via client, not DB default)
ALTER TABLE "Restaurant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RestaurantOwner" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestaurantOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "razorpaySubId" TEXT NOT NULL,
    "razorpayPlanId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'pending',
    "amount" INTEGER NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "haltedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" "PaymentEventType" NOT NULL,
    "razorpayEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DishSlot" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "dishName" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "isVeg" BOOLEAN NOT NULL DEFAULT true,
    "status" "SlotStatus" NOT NULL DEFAULT 'empty',
    "photoKeys" TEXT[],
    "glbKey" TEXT,
    "glbUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DishSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantOwner_clerkUserId_key" ON "RestaurantOwner"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RestaurantOwner_restaurantId_key" ON "RestaurantOwner"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_restaurantId_key" ON "Subscription"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_razorpaySubId_key" ON "Subscription"("razorpaySubId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_razorpayEventId_key" ON "PaymentEvent"("razorpayEventId");

-- CreateIndex
CREATE UNIQUE INDEX "DishSlot_restaurantId_slotNumber_key" ON "DishSlot"("restaurantId", "slotNumber");

-- AddForeignKey
ALTER TABLE "RestaurantOwner" ADD CONSTRAINT "RestaurantOwner_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DishSlot" ADD CONSTRAINT "DishSlot_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
