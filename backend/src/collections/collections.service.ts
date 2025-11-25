import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private prisma: DatabaseService) {}

  async create(dto: CreateCollectionDto) {
    // Validate symbol: minimum 4 characters, only lowercase a-z and "-"
    if (!/^[a-z-]{4,}$/.test(dto.symbol)) {
      throw new Error(
        'Symbol must be at least 4 characters, only lowercase letters a-z and "-" allowed',
      );
    }

    // Create the collection first
    const collection = await this.prisma.collections.create({
      data: {
        name: dto.name,
        symbol: dto.symbol,
        description: dto.description,
        profileInscriptionId: dto.profileInscriptionId,
        socialLink: dto.socialLink,
        personalLink: dto.personalLink,
        totalSupply: dto.totalSupply,
        walletAddress: dto.wallet,
      },
    });

    // Create inscriptions and listings one-by-one
    for (const item of dto.inscriptions) {
      const inscription = await this.prisma.inscriptions.create({
        data: {
          collectionId: collection.id,
          inscriptionId: item.inscriptionId,
          name: item.name,
          attributes: item.attributes,
        },
      });

      // initial "unlisted" listing
      await this.prisma.listings.create({
        data: {
          inscriptionId: inscription.id,
          status: 'unlisted',
          sellerAddress: dto.wallet,
        },
      });
    }

    return collection;
  }

  async findAll() {
    const collections = await this.prisma.collections.findMany({
      include: {
        inscriptions: {
          include: {
            listings: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    return collections;
  }
}
