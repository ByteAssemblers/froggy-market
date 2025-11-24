import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/database.service';

@Injectable()
export class InformationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get biggest sales of the day (last 24 hours)
   * Fetches sold items from listings, pepemapListings, and prc20Listings
   * Sorted by priceSats descending
   */
  async getBiggestSalesOfDay() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Fetch sold NFT listings from the last 24 hours
    const nftSales = await this.prisma.listings.findMany({
      where: {
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
      include: {
        inscription: {
          include: {
            collection: true,
          },
        },
      },
    });

    // Fetch sold pepemap listings from the last 24 hours
    const pepemapSales = await this.prisma.pepemapListings.findMany({
      where: {
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    // Fetch sold prc20 listings from the last 24 hours
    const prc20Sales = await this.prisma.prc20Listings.findMany({
      where: {
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });

    // Transform and combine all sales
    const combinedSales = [
      ...nftSales.map((sale) => ({
        type: 'nft' as const,
        id: sale.id,
        inscriptionId: sale.inscription?.inscriptionId || null,
        collectionName: sale.inscription?.collection?.name || null,
        collectionSymbol: sale.inscription?.collection?.symbol || null,
        priceSats: sale.priceSats || 0,
        sellerAddress: sale.sellerAddress,
        buyerAddress: sale.buyerAddress,
        txid: sale.txid,
        createdAt: sale.createdAt,
      })),
      ...pepemapSales.map((sale) => ({
        type: 'pepemap' as const,
        id: sale.id,
        inscriptionId: sale.inscriptionId,
        pepemapLabel: sale.pepemapLabel,
        blockNumber: sale.blockNumber,
        priceSats: sale.priceSats || 0,
        sellerAddress: sale.sellerAddress,
        buyerAddress: sale.buyerAddress,
        txid: sale.txid,
        createdAt: sale.createdAt,
      })),
      ...prc20Sales.map((sale) => ({
        type: 'prc20' as const,
        id: sale.id,
        inscriptionId: sale.inscriptionId,
        prc20Label: sale.prc20Label,
        amount: sale.amount,
        priceSats: sale.priceSats || 0,
        sellerAddress: sale.sellerAddress,
        buyerAddress: sale.buyerAddress,
        txid: sale.txid,
        createdAt: sale.createdAt,
      })),
    ];

    // Sort by priceSats descending (biggest first)
    const sortedSales = combinedSales.sort((a, b) => b.priceSats - a.priceSats);

    return sortedSales;
  }

  /**
   * Get Pepemap collection statistics
   */
  async getPepemapInfo() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get all pepemap listings to determine latest status per inscriptionId
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

    const latestListings = Array.from(latestListingsMap.values());

    // 1. Floor Price: Lowest priceSats among inscriptions with latest status = 'listed'
    const listedPepemaps = latestListings.filter(
      (listing) => listing.status === 'listed' && listing.priceSats,
    );
    const floorPrice =
      listedPepemaps.length > 0
        ? Math.min(...listedPepemaps.map((l) => l.priceSats || 0))
        : 0;

    // 2. Floor Price (24h ago): Get listings that were created before 24h ago
    const listingsOlderThan24h = allListings.filter(
      (listing) => listing.createdAt < twentyFourHoursAgo,
    );

    // Group by inscriptionId and get the latest listing (as of 24h ago)
    const listingsMap24hAgo = new Map();
    for (const listing of listingsOlderThan24h) {
      if (!listingsMap24hAgo.has(listing.inscriptionId)) {
        listingsMap24hAgo.set(listing.inscriptionId, listing);
      }
    }

    const listings24hAgo = Array.from(listingsMap24hAgo.values());
    const listedPepemaps24hAgo = listings24hAgo.filter(
      (listing) => listing.status === 'listed' && listing.priceSats,
    );

    const floorPrice24hAgo =
      listedPepemaps24hAgo.length > 0
        ? Math.min(...listedPepemaps24hAgo.map((l) => l.priceSats || 0))
        : 0;

    // 3. 24h % change: (current / old) - 1
    const change24h =
      floorPrice24hAgo > 0 ? (floorPrice / floorPrice24hAgo - 1) * 100 : 0;

    // 4. Volume (24h): Sum of all priceSats where status = 'sold' in the last 24 hours
    const soldLast24h = await this.prisma.pepemapListings.findMany({
      where: {
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });
    const volume24h = soldLast24h.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 3. Total Volume: Sum of all priceSats where status = 'sold' (all time)
    const allSold = await this.prisma.pepemapListings.findMany({
      where: {
        status: 'sold',
      },
    });
    const totalVolume = allSold.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 5. Trades (24h): Count of rows where status = 'sold' in the last 24 hours
    const trades24h = soldLast24h.length;

    // 6. Listed: Count of inscriptions where latest status = 'listed'
    const listed = listedPepemaps.length;

    return {
      floorPrice,
      change24h,
      volume24h,
      totalVolume,
      trades24h,
      listed,
    };
  }

  /**
   * Get collection-specific statistics
   */
  async getCollectionInfo(collectionSymbol: string) {
    // Find collection by symbol
    const collection = await this.prisma.collections.findFirst({
      where: { symbol: collectionSymbol },
    });

    if (!collection) {
      throw new NotFoundException(`Collection with symbol "${collectionSymbol}" not found`);
    }

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get all inscriptions in this collection
    const inscriptions = await this.prisma.inscriptions.findMany({
      where: { collectionId: collection.id },
    });

    // Supply: Total number of inscriptions in this collection
    const supply = inscriptions.length;

    if (supply === 0) {
      return {
        floorPrice: 0,
        change24h: 0,
        volume24h: 0,
        totalVolume: 0,
        trades24h: 0,
        owners: 0,
        supply: 0,
        listed: 0,
      };
    }

    const inscriptionIds = inscriptions.map((insc) => insc.id);

    // Get all listings for inscriptions in this collection
    const allListings = await this.prisma.listings.findMany({
      where: {
        inscriptionId: { in: inscriptionIds },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by inscriptionId and get only the latest listing
    const latestListingsMap = new Map();
    for (const listing of allListings) {
      if (listing.inscriptionId && !latestListingsMap.has(listing.inscriptionId)) {
        latestListingsMap.set(listing.inscriptionId, listing);
      }
    }

    const latestListings = Array.from(latestListingsMap.values());

    // 1. Floor Price: Lowest priceSats among inscriptions with latest status = 'listed'
    const listedItems = latestListings.filter(
      (listing) => listing.status === 'listed' && listing.priceSats,
    );
    const floorPrice =
      listedItems.length > 0
        ? Math.min(...listedItems.map((l) => l.priceSats || 0))
        : 0;

    // 2. Floor Price (24h ago): Get listings that were created before 24h ago
    const listingsOlderThan24h = allListings.filter(
      (listing) => listing.createdAt < twentyFourHoursAgo,
    );

    // Group by inscriptionId and get the latest listing (as of 24h ago)
    const listingsMap24hAgo = new Map();
    for (const listing of listingsOlderThan24h) {
      if (listing.inscriptionId && !listingsMap24hAgo.has(listing.inscriptionId)) {
        listingsMap24hAgo.set(listing.inscriptionId, listing);
      }
    }

    const listings24hAgo = Array.from(listingsMap24hAgo.values());
    const listedItems24hAgo = listings24hAgo.filter(
      (listing) => listing.status === 'listed' && listing.priceSats,
    );

    const floorPrice24hAgo =
      listedItems24hAgo.length > 0
        ? Math.min(...listedItems24hAgo.map((l) => l.priceSats || 0))
        : 0;

    // 3. 24h % change: (current / old) - 1
    const change24h =
      floorPrice24hAgo > 0 ? (floorPrice / floorPrice24hAgo - 1) * 100 : 0;

    // 4. Volume (24h): Sum of all priceSats where status = 'sold' in the last 24 hours
    const soldLast24h = await this.prisma.listings.findMany({
      where: {
        inscriptionId: { in: inscriptionIds },
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });
    const volume24h = soldLast24h.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 3. Total Volume: Sum of all priceSats where status = 'sold' (all time)
    const allSold = await this.prisma.listings.findMany({
      where: {
        inscriptionId: { in: inscriptionIds },
        status: 'sold',
      },
    });
    const totalVolume = allSold.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 5. Trades (24h): Count of rows where status = 'sold' in the last 24 hours
    const trades24h = soldLast24h.length;

    // 6. Owners: Count of unique sellerAddress from inscriptions with latest status
    const uniqueOwners = new Set(
      latestListings.map((listing) => listing.sellerAddress),
    );
    const owners = uniqueOwners.size;

    // 7. Listed: Count of inscriptions where latest status = 'listed'
    const listed = listedItems.length;

    return {
      floorPrice,
      change24h,
      volume24h,
      totalVolume,
      trades24h,
      owners,
      supply,
      listed,
    };
  }

  /**
   * Get PRC20 token statistics
   */
  async getPrc20Info(tick: string) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Get all prc20 listings for this tick
    const allListings = await this.prisma.prc20Listings.findMany({
      where: { prc20Label: tick },
      orderBy: { createdAt: 'desc' },
    });

    if (allListings.length === 0) {
      return {
        floorPrice: 0,
        change24h: 0,
        volume24h: 0,
        totalVolume: 0,
      };
    }

    // Group by inscriptionId and get only the latest listing
    const latestListingsMap = new Map();
    for (const listing of allListings) {
      if (!latestListingsMap.has(listing.inscriptionId)) {
        latestListingsMap.set(listing.inscriptionId, listing);
      }
    }

    const latestListings = Array.from(latestListingsMap.values());

    // 1. Floor Price (now): Lowest (priceSats / amount) among inscriptions with latest status = 'listed'
    const currentListedItems = latestListings.filter(
      (listing) => listing.status === 'listed' && listing.priceSats && listing.amount,
    );
    const floorPrice =
      currentListedItems.length > 0
        ? Math.min(...currentListedItems.map((l) => (l.priceSats || 0) / l.amount))
        : 0;

    // 2. Floor Price (24h ago): Get listings that were created before 24h ago and had status = 'listed'
    const listingsOlderThan24h = allListings.filter(
      (listing) => listing.createdAt < twentyFourHoursAgo,
    );

    // Group by inscriptionId and get the latest listing (as of 24h ago)
    const listingsMap24hAgo = new Map();
    for (const listing of listingsOlderThan24h) {
      if (!listingsMap24hAgo.has(listing.inscriptionId)) {
        listingsMap24hAgo.set(listing.inscriptionId, listing);
      }
    }

    const listings24hAgo = Array.from(listingsMap24hAgo.values());
    const listedItems24hAgo = listings24hAgo.filter(
      (listing) => listing.status === 'listed' && listing.priceSats && listing.amount,
    );

    const floorPrice24hAgo =
      listedItems24hAgo.length > 0
        ? Math.min(...listedItems24hAgo.map((l) => (l.priceSats || 0) / l.amount))
        : 0;

    // 3. 24h % change: (current / old) - 1
    const change24h =
      floorPrice24hAgo > 0 ? (floorPrice / floorPrice24hAgo - 1) * 100 : 0;

    // 4. Volume (24h): Sum of all priceSats where status = 'sold' in the last 24 hours
    const soldLast24h = await this.prisma.prc20Listings.findMany({
      where: {
        prc20Label: tick,
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });
    const volume24h = soldLast24h.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 5. Total Volume: Sum of all priceSats where status = 'sold' (all time)
    const allSold = await this.prisma.prc20Listings.findMany({
      where: {
        prc20Label: tick,
        status: 'sold',
      },
    });
    const totalVolume = allSold.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    return {
      floorPrice,
      change24h,
      volume24h,
      totalVolume,
    };
  }
}
