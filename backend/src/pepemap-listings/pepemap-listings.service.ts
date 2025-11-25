import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PepemapListingsService {
  constructor(private prisma: DatabaseService) {}

  /**
   * Extract block number from pepemap label (e.g., "12345.pepemap" -> 12345)
   */
  private extractBlockNumber(pepemapLabel: string): number | null {
    const match = pepemapLabel.match(/(\d+)\.pepemap/i);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
    return null;
  }

  /**
   * List Pepemap - adds a row with status='listed'
   */
  async listPepemap(dto: {
    inscriptionId: string;
    pepemapLabel: string;
    priceSats: number;
    sellerAddress: string;
    psbtBase64?: string;
  }) {
    const { inscriptionId, pepemapLabel, priceSats, sellerAddress, psbtBase64 } = dto;

    // Extract block number from label
    const blockNumber = this.extractBlockNumber(pepemapLabel);
    if (blockNumber === null) {
      throw new BadRequestException('Invalid pepemap label format');
    }

    // Check if already listed
    const existingListing = await this.prisma.pepemapListings.findFirst({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingListing && existingListing.status === 'listed') {
      throw new BadRequestException('This pepemap is already listed');
    }

    // Create a new listing record with status='listed'
    const listing = await this.prisma.pepemapListings.create({
      data: {
        inscriptionId,
        pepemapLabel,
        blockNumber,
        status: 'listed',
        priceSats,
        sellerAddress,
        psbtBase64: psbtBase64 || null,
      },
    });

    return {
      success: true,
      listing,
      message: 'Pepemap listed successfully',
    };
  }

  /**
   * Buy Pepemap - adds a row with status='sold'
   */
  async buyPepemap(dto: {
    inscriptionId: string;
    buyerAddress: string;
    priceSats: number;
    txid?: string;
  }) {
    const { inscriptionId, buyerAddress, priceSats, txid } = dto;

    // Get the latest listing status
    const latestListing = await this.prisma.pepemapListings.findFirst({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestListing || latestListing.status !== 'listed') {
      throw new BadRequestException('This pepemap is not listed for sale');
    }

    // Create a new listing record with status='sold'
    const soldListing = await this.prisma.pepemapListings.create({
      data: {
        inscriptionId,
        pepemapLabel: latestListing.pepemapLabel,
        blockNumber: latestListing.blockNumber,
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
      message: 'Pepemap purchased successfully',
    };
  }

  /**
   * Unlist Pepemap - adds a row with status='unlisted'
   */
  async unlistPepemap(dto: { inscriptionId: string; sellerAddress: string }) {
    const { inscriptionId, sellerAddress } = dto;

    // Get the latest listing status
    const latestListing = await this.prisma.pepemapListings.findFirst({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestListing || latestListing.status !== 'listed') {
      throw new BadRequestException('This pepemap is not currently listed');
    }

    // Verify ownership
    if (latestListing.sellerAddress !== sellerAddress) {
      throw new BadRequestException('You are not the seller of this pepemap');
    }

    // Create a new listing record with status='unlisted'
    const unlistedListing = await this.prisma.pepemapListings.create({
      data: {
        inscriptionId,
        pepemapLabel: latestListing.pepemapLabel,
        blockNumber: latestListing.blockNumber,
        status: 'unlisted',
        sellerAddress,
      },
    });

    return {
      success: true,
      listing: unlistedListing,
      message: 'Pepemap unlisted successfully',
    };
  }

  /**
   * Send Pepemap - adds a row with status='sent'
   */
  async sendPepemap(dto: {
    inscriptionId: string;
    pepemapLabel: string;
    fromAddress: string;
    toAddress: string;
    txid: string;
  }) {
    const { inscriptionId, pepemapLabel, fromAddress, toAddress, txid } = dto;

    // Extract block number from label
    const blockNumber = this.extractBlockNumber(pepemapLabel);
    if (blockNumber === null) {
      throw new BadRequestException('Invalid pepemap label format');
    }

    // Create a new listing record with status='sent'
    const sentListing = await this.prisma.pepemapListings.create({
      data: {
        inscriptionId,
        pepemapLabel,
        blockNumber,
        status: 'sent',
        sellerAddress: fromAddress,
        buyerAddress: toAddress,
        txid,
      },
    });

    return {
      success: true,
      listing: sentListing,
      message: 'Pepemap sent successfully',
    };
  }

  /**
   * Get pepemap listing status by inscriptionId
   */
  async getPepemapStatus(inscriptionId: string) {
    const latestListing = await this.prisma.pepemapListings.findFirst({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestListing) {
      return {
        status: null,
        listing: null,
      };
    }

    return {
      status: latestListing.status,
      listing: latestListing,
    };
  }

  /**
   * Get all active pepemap listings (status='listed')
   */
  async getActivePepemapListings() {
    // Get all inscriptionIds with latest status='listed'
    const allListings = await this.prisma.pepemapListings.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Group by inscriptionId and get only the latest listing
    const latestListingsMap = new Map();
    for (const listing of allListings) {
      if (!latestListingsMap.has(listing.inscriptionId)) {
        latestListingsMap.set(listing.inscriptionId, listing);
      }
    }

    // Filter only listed pepemaps
    const activeListings = Array.from(latestListingsMap.values()).filter(
      (listing) => listing.status === 'listed',
    );

    return activeListings;
  }

  /**
   * Get all sold pepemap listings (activity)
   */
  async getSoldActivity() {
    const soldListings = await this.prisma.pepemapListings.findMany({
      where: {
        status: 'sold',
      },
      orderBy: { createdAt: 'desc' },
    });

    return soldListings;
  }
}
