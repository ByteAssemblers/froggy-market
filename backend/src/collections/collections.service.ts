import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCollectionDto) {
    // Validate symbol: minimum 4 characters, only lowercase a-z and "-"
    if (!/^[a-z-]{4,}$/.test(dto.symbol)) {
      throw new Error(
        'Symbol must be at least 4 characters, only lowercase letters a-z and "-" allowed'
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const collection = await tx.collections.create({
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

        // Create inscriptions and listings for each inscription
        for (const item of dto.inscriptions) {
          const inscription = await tx.inscriptions.create({
            data: {
              collectionId: collection.id,
              inscriptionId: item.inscriptionId,
              name: item.name,
              attributes: item.attributes,
            },
          });

          // Create initial listing with "unlisted" status
          await tx.listings.create({
            data: {
              inscriptionId: inscription.id,
              status: 'unlisted',
              sellerAddress: dto.wallet,
            },
          });
        }
        
        return collection;
      },
      {
        maxWait: 10000, // 10 seconds max wait to start transaction
        timeout: 30000, // 30 seconds timeout for transaction
      }
    );
  }

  async findAll() {
    return this.prisma.collections.findMany({
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
  }
}
