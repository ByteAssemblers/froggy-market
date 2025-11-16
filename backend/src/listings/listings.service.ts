import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/database.service';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * List NFT - adds a row with status='listed'
   */
  async listNFT(dto: {
    inscriptionId: string;
    priceSats: number;
    sellerAddress: string;
    psbtBase64?: string;
  }) {
    const { inscriptionId, priceSats, sellerAddress, psbtBase64 } = dto;

    // Find the inscription by blockchain inscriptionId
    const inscription = await this.prisma.inscriptions.findUnique({
      where: { inscriptionId },
    });

    if (!inscription) {
      throw new BadRequestException(
        'Inscription not found. It must be part of a collection first.',
      );
    }

    // Create a new listing record with status='listed'
    const listing = await this.prisma.listings.create({
      data: {
        inscriptionId: inscription.id,
        status: 'listed',
        priceSats,
        sellerAddress,
        psbtBase64: psbtBase64 || null,
      },
    });

    return {
      success: true,
      listing,
      message: 'NFT listed successfully',
    };
  }

  /**
   * Buy NFT - adds a row with status='sold'
   */
  async buyNFT(dto: {
    inscriptionId: string;
    buyerAddress: string;
    priceSats: number;
    txid?: string;
  }) {
    const { inscriptionId, buyerAddress, priceSats, txid } = dto;

    // Find the inscription
    const inscription = await this.prisma.inscriptions.findUnique({
      where: { inscriptionId },
    });

    if (!inscription) {
      throw new BadRequestException('Inscription not found');
    }

    // Get the latest listing status
    const latestListing = await this.prisma.listings.findFirst({
      where: { inscriptionId: inscription.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestListing || latestListing.status !== 'listed') {
      throw new BadRequestException('This NFT is not listed for sale');
    }

    // Create a new listing record with status='sold'
    const soldListing = await this.prisma.listings.create({
      data: {
        inscriptionId: inscription.id,
        status: 'sold',
        priceSats,
        sellerAddress: latestListing.sellerAddress,
        buyerAddress,
        txid: txid || null,
      },
    });

    return {
      success: true,
      listing: soldListing,
      message: 'NFT purchased successfully',
    };
  }

  /**
   * Unlist NFT - adds a row with status='unlisted'
   */
  async unlistNFT(dto: { inscriptionId: string; sellerAddress: string }) {
    const { inscriptionId, sellerAddress } = dto;

    // Find the inscription
    const inscription = await this.prisma.inscriptions.findUnique({
      where: { inscriptionId },
    });

    if (!inscription) {
      throw new BadRequestException('Inscription not found');
    }

    // Get the latest listing status
    const latestListing = await this.prisma.listings.findFirst({
      where: { inscriptionId: inscription.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestListing || latestListing.status !== 'listed') {
      throw new BadRequestException('This NFT is not currently listed');
    }

    // Verify ownership
    if (latestListing.sellerAddress !== sellerAddress) {
      throw new BadRequestException('You are not the seller of this NFT');
    }

    // Create a new listing record with status='unlisted'
    const unlistedListing = await this.prisma.listings.create({
      data: {
        inscriptionId: inscription.id,
        status: 'unlisted',
        sellerAddress,
      },
    });

    return {
      success: true,
      listing: unlistedListing,
      message: 'NFT unlisted successfully',
    };
  }

  /**
   * Get all active listings (status='listed')
   */
  async getActiveListings() {
    // Get the latest status for each inscription
    const activeListings = await this.prisma.$queryRaw`
      WITH latest_listings AS (
        SELECT DISTINCT ON ("inscriptionId")
          id,
          "inscriptionId",
          status,
          "priceSats",
          "sellerAddress",
          "createdAt"
        FROM listings
        ORDER BY "inscriptionId", "createdAt" DESC
      )
      SELECT l.*
      FROM listings l
      INNER JOIN latest_listings ll
        ON l.id = ll.id
      WHERE ll.status = 'listed'
      ORDER BY l."createdAt" DESC
    `;

    // Fetch full details with relations
    const listingIds = (activeListings as any[]).map((l) => l.id);

    return this.prisma.listings.findMany({
      where: { id: { in: listingIds } },
      include: {
        inscription: {
          include: {
            collection: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get the latest listing status for a specific inscription
   */
  async getInscriptionListingStatus(blockchainInscriptionId: string) {
    // Find the inscription
    const inscription = await this.prisma.inscriptions.findUnique({
      where: { inscriptionId: blockchainInscriptionId },
    });

    if (!inscription) {
      return { status: null, listing: null };
    }

    // Get latest listing
    const latestListing = await this.prisma.listings.findFirst({
      where: { inscriptionId: inscription.id },
      orderBy: { createdAt: 'desc' },
      include: {
        inscription: {
          include: {
            collection: true,
          },
        },
      },
    });

    return {
      status: latestListing?.status || null,
      listing: latestListing,
    };
  }
}
