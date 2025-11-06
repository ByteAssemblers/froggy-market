/*
  Warnings:

  - You are about to drop the `Collection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Inscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InscriptionActivity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Inscription" DROP CONSTRAINT "Inscription_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."InscriptionActivity" DROP CONSTRAINT "InscriptionActivity_inscriptionId_fkey";

-- DropTable
DROP TABLE "public"."Collection";

-- DropTable
DROP TABLE "public"."Inscription";

-- DropTable
DROP TABLE "public"."InscriptionActivity";

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "description" TEXT,
    "profileInscriptionId" TEXT,
    "socialLink" TEXT,
    "personalLink" TEXT,
    "totalSupply" INTEGER,
    "walletAddress" TEXT NOT NULL,
    "approve" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscriptions" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "name" TEXT,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscription_activities" (
    "id" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "state" "State" NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "buyerAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscription_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inscriptions_inscriptionId_key" ON "inscriptions"("inscriptionId");

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscription_activities" ADD CONSTRAINT "inscription_activities_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "inscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
