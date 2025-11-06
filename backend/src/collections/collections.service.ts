import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  // Create a collection
  async createCollection(
    name: string,
    symbol: string,
    description: string,
    profileInscriptionId: string,
    onlineUrl: string,
    myUrl: string | null,
    totalSupply: number,
    inscriptionsList: any,
    walletAddress: string,
  ) {
    return this.prisma.collection.create({
      data: {
        name,
        symbol,
        description,
        profileInscriptionId,
        onlineUrl,
        myUrl,
        totalSupply,
        inscriptionsList,
        walletAddress,
      },
    });
  }

  // Get all collections
  async getCollections() {
    return this.prisma.collection.findMany();
  }

  // Get collections by wallet address
  async getCollectionsByWalletAddress(walletAddress: string) {
    return this.prisma.collection.findMany({
      where: {
        walletAddress: walletAddress,
      },
    });
  }

  // Update a collection
  async updateCollection(id: number, data: any) {
    return this.prisma.collection.update({
      where: { id },
      data,
    });
  }

  // Delete a collection
  async deleteCollection(id: number) {
    return this.prisma.collection.delete({
      where: { id },
    });
  }
}
