import { Injectable, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class Prc20ListingsService {
  constructor(private prisma: DatabaseService) {}

  /**
   * List Prc20 - adds a row with status='listed'
   */
  async listPrc20(dto: {
    inscriptionId: string;
    prc20Label: string;
    amount: number;
    priceSats: number;
    sellerAddress: string;
    psbtBase64?: string;
  }) {
    const {
      inscriptionId,
      prc20Label,
      amount,
      priceSats,
      sellerAddress,
      psbtBase64,
    } = dto;

    // Check if already listed
    const existingListing = await this.prisma.prc20Listings.findFirst({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingListing && existingListing.status === 'listed') {
      throw new BadRequestException('This prc20 is already listed');
    }

    // Create a new listing record with status='listed'
    const listing = await this.prisma.prc20Listings.create({
      data: {
        inscriptionId,
        prc20Label,
        amount,
        status: 'listed',
        priceSats,
        sellerAddress,
        psbtBase64: psbtBase64 || null,
      },
    });

    return {
      success: true,
      listing,
      message: 'Prc20 listed successfully',
    };
  }

  /**
   * Buy Prc20 - adds a row with status='sold'
   */
  async buyPrc20(dto: {
    inscriptionId: string;
    buyerAddress: string;
    priceSats: number;
    txid?: string;
  }) {
    const { inscriptionId, buyerAddress, priceSats, txid } = dto;

    // Get the latest listing status
    const latestListing = await this.prisma.prc20Listings.findFirst({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestListing || latestListing.status !== 'listed') {
      throw new BadRequestException('This prc20 is not listed for sale');
    }

    // Create a new listing record with status='sold'
    const soldListing = await this.prisma.prc20Listings.create({
      data: {
        inscriptionId,
        prc20Label: latestListing.prc20Label,
        amount: latestListing.amount,
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
      message: 'Prc20 purchased successfully',
    };
  }

  /**
   * Unlist Prc20 - adds a row with status='unlisted'
   */
  async unlistPrc20(dto: { inscriptionId: string; sellerAddress: string }) {
    const { inscriptionId, sellerAddress } = dto;

    // Get the latest listing status
    const latestListing = await this.prisma.prc20Listings.findFirst({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestListing || latestListing.status !== 'listed') {
      throw new BadRequestException('This prc20 is not currently listed');
    }

    // Verify ownership
    if (latestListing.sellerAddress !== sellerAddress) {
      throw new BadRequestException('You are not the seller of this prc20');
    }

    // Create a new listing record with status='unlisted'
    const unlistedListing = await this.prisma.prc20Listings.create({
      data: {
        inscriptionId,
        prc20Label: latestListing.prc20Label,
        amount: latestListing.amount,
        status: 'unlisted',
        sellerAddress,
      },
    });

    return {
      success: true,
      listing: unlistedListing,
      message: 'Prc20 unlisted successfully',
    };
  }

  /**
   * Send Prc20 - adds a row with status='sent'
   */
  async sendPrc20(dto: {
    inscriptionId: string;
    prc20Label: string;
    amount: number;
    fromAddress: string;
    toAddress: string;
    txid: string;
  }) {
    const { inscriptionId, prc20Label, amount, fromAddress, toAddress, txid } =
      dto;

    // Create a new listing record with status='sent'
    const sentListing = await this.prisma.prc20Listings.create({
      data: {
        inscriptionId,
        prc20Label,
        amount,
        status: 'sent',
        sellerAddress: fromAddress,
        buyerAddress: toAddress,
        txid,
      },
    });

    return {
      success: true,
      listing: sentListing,
      message: 'Prc20 sent successfully',
    };
  }

  /**
   * Handle Inscribe - adds a row with status='transfer' when PRC-20 is inscribed
   */
  async handleInscribe(dto: {
    inscriptionId: string;
    prc20Label: string;
    amount: number;
    sellerAddress: string;
    txid: string;
  }) {
    const { inscriptionId, prc20Label, amount, sellerAddress, txid } = dto;

    // Create a new listing record with status='transfer'
    const transferListing = await this.prisma.prc20Listings.create({
      data: {
        inscriptionId,
        prc20Label,
        amount,
        status: 'transfer',
        sellerAddress,
        txid,
      },
    });

    return {
      success: true,
      listing: transferListing,
      message: 'Prc20 inscribed successfully',
    };
  }

  /**
   * Get prc20 listing status by inscriptionId
   */
  async getPrc20Status(inscriptionId: string) {
    const latestListing = await this.prisma.prc20Listings.findFirst({
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
   * Get all active prc20 listings (status='listed')
   */
  async getActivePrc20Listings() {
    // Get all inscriptionIds with latest status='listed'
    const allListings = await this.prisma.prc20Listings.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Group by inscriptionId and get only the latest listing
    const latestListingsMap = new Map();
    for (const listing of allListings) {
      if (!latestListingsMap.has(listing.inscriptionId)) {
        latestListingsMap.set(listing.inscriptionId, listing);
      }
    }

    // Filter only listed prc20s
    const activeListings = Array.from(latestListingsMap.values()).filter(
      (listing) => listing.status === 'listed',
    );

    return activeListings;
  }

  /**
   * Get activity for a specific PRC20 token or all tokens (transfer, listed, unlisted, sold - excluding sent)
   */
  async getActivity(tick?: string) {
    // If no tick provided, get all tokens' activity
    if (!tick) {
      return this.getAllActivity();
    }

    const activityListings = await this.prisma.prc20Listings.findMany({
      where: {
        prc20Label: tick,
        status: {
          in: ['transfer', 'listed', 'unlisted', 'sold'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return activityListings;
  }

  /**
   * Get all activity across all PRC20 tokens
   */
  private async getAllActivity() {
    // Get all unique prc20Labels
    const allListings = await this.prisma.prc20Listings.findMany({
      select: { prc20Label: true },
      distinct: ['prc20Label'],
    });

    const uniqueTicks = allListings.map((listing) => listing.prc20Label);

    // Get activity for each tick
    const prc20Activity = await Promise.all(
      uniqueTicks.map(async (tick) => {
        const activity = await this.getActivity(tick);
        return {
          tick,
          activity,
        };
      }),
    );

    return prc20Activity;
  }

  /**
   * Get transactions for a specific PRC20 token or all tokens (sold, transfer)
   */
  async getTransactions(tick?: string) {
    // If no tick provided, get all tokens' transactions
    if (!tick) {
      return this.getAllTransactions();
    }

    const transactions = await this.prisma.prc20Listings.findMany({
      where: {
        prc20Label: tick,
        status: {
          in: ['sold', 'transfer'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return transactions;
  }

  /**
   * Get all transactions across all PRC20 tokens
   */
  private async getAllTransactions() {
    // Get all unique prc20Labels
    const allListings = await this.prisma.prc20Listings.findMany({
      select: { prc20Label: true },
      distinct: ['prc20Label'],
    });

    const uniqueTicks = allListings.map((listing) => listing.prc20Label);

    // Get transactions for each tick
    const prc20Transactions = await Promise.all(
      uniqueTicks.map(async (tick) => {
        const transactions = await this.getTransactions(tick);
        return {
          tick,
          transactions,
        };
      }),
    );

    return prc20Transactions;
  }
}
