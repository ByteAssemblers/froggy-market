-- CreateEnum
CREATE TYPE "State" AS ENUM ('unlisted', 'listed', 'sold');

-- CreateTable
CREATE TABLE "Collection" (
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

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "name" TEXT,
    "attributes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscriptionActivity" (
    "id" TEXT NOT NULL,
    "inscriptionId" TEXT NOT NULL,
    "state" "State" NOT NULL,
    "sellerAddress" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "buyerAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InscriptionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_inscriptionId_key" ON "Inscription"("inscriptionId");

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscriptionActivity" ADD CONSTRAINT "InscriptionActivity_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
