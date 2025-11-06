import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCollectionDto) {
    return this.prisma.$transaction(async (tx) => {
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

      for (const item of dto.inscriptions) {
        const inscription = await tx.inscriptions.create({
          data: {
            collectionId: collection.id,
            inscriptionId: item.inscriptionId,
            name: item.name,
            attributes: item.attributes,
          },
        });

        await tx.inscription_activities.create({
          data: {
            inscriptionId: inscription.id,
            state: 'unlisted',
            sellerAddress: dto.wallet,
          },
        });
      }

      return collection;
    });
  }

  async findAll() {
    return this.prisma.collections.findMany({
      include: {
        inscriptions: {
          include: {
            activities: true,
          },
        },
      },
    });
  }
}
