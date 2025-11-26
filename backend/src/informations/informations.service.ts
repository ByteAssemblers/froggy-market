import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class InformationsService {
  constructor(private prisma: DatabaseService) {}

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
   * Get collection-specific statistics or all collections
   */
  async getCollectionInfo(collectionSymbol?: string) {
    // If no symbol provided, get all collections
    if (!collectionSymbol) {
      return this.getAllCollectionsInfo();
    }

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
   * Get all collections info
   */
  private async getAllCollectionsInfo() {
    const collections = await this.prisma.collections.findMany();

    const collectionsInfo = await Promise.all(
      collections.map(async (collection) => {
        const stats = await this.getCollectionInfo(collection.symbol);
        return {
          symbol: collection.symbol,
          name: collection.name,
          ...stats,
        };
      })
    );

    return collectionsInfo;
  }

  /**
   * Get PRC20 token statistics or all tokens
   */
  async getPrc20Info(tick?: string) {
    // If no tick provided, get all tokens
    if (!tick) {
      return this.getAllPrc20Info();
    }
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

  /**
   * Get all PRC20 tokens info
   */
  private async getAllPrc20Info() {
    // Get all unique prc20Labels
    const allListings = await this.prisma.prc20Listings.findMany({
      select: { prc20Label: true },
      distinct: ['prc20Label'],
    });

    const uniqueTicks = allListings.map((listing) => listing.prc20Label);

    const prc20Info = await Promise.all(
      uniqueTicks.map(async (tick) => {
        const stats = await this.getPrc20Info(tick);
        return {
          tick,
          ...stats,
        };
      })
    );

    return prc20Info;
  }

  /**
   * Get marketplace-wide statistics (aggregate of all three marketplaces)
   */
  async getMarketplaceStats() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // 1. Volume (24h) from listings (NFT collections)
    const nftSoldLast24h = await this.prisma.listings.findMany({
      where: {
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });
    const nftVolume24h = nftSoldLast24h.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 2. Volume (24h) from pepemapListings
    const pepemapSoldLast24h = await this.prisma.pepemapListings.findMany({
      where: {
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });
    const pepemapVolume24h = pepemapSoldLast24h.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 3. Volume (24h) from prc20Listings
    const prc20SoldLast24h = await this.prisma.prc20Listings.findMany({
      where: {
        status: 'sold',
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    });
    const prc20Volume24h = prc20SoldLast24h.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // Total 24h volume across all marketplaces
    const volume24h = nftVolume24h + pepemapVolume24h + prc20Volume24h;

    // 4. Total Volume (all time) from listings
    const nftSoldAll = await this.prisma.listings.findMany({
      where: {
        status: 'sold',
      },
    });
    const nftTotalVolume = nftSoldAll.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 5. Total Volume (all time) from pepemapListings
    const pepemapSoldAll = await this.prisma.pepemapListings.findMany({
      where: {
        status: 'sold',
      },
    });
    const pepemapTotalVolume = pepemapSoldAll.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // 6. Total Volume (all time) from prc20Listings
    const prc20SoldAll = await this.prisma.prc20Listings.findMany({
      where: {
        status: 'sold',
      },
    });
    const prc20TotalVolume = prc20SoldAll.reduce(
      (sum, listing) => sum + (listing.priceSats || 0),
      0,
    );

    // Total volume across all marketplaces (all time)
    const totalVolume = nftTotalVolume + pepemapTotalVolume + prc20TotalVolume;

    return {
      volume24h,
      totalVolume,
    };
  }

  /**
   * Helper function to format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get pepemap floor price history (all time, daily)
   */
  async getPepemapFloorPriceHistory() {
    // Get all pepemap listings ordered by date
    const allListings = await this.prisma.pepemapListings.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (allListings.length === 0) {
      return [];
    }

    // Get date range
    const firstDate = new Date(allListings[0].createdAt);
    const lastDate = new Date();

    // Generate array of dates from first listing to today
    const dates: string[] = [];
    const currentDate = new Date(firstDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= lastDate) {
      dates.push(this.formatDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate floor price for each day
    const floorPriceHistory = dates.map((dateStr) => {
      // Get end of day
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all listings created up to end of this day
      const listingsUpToDate = allListings.filter(
        (listing) => listing.createdAt <= endOfDay,
      );

      // Group by inscriptionId and get latest status as of end of day
      const latestListingsMap = new Map();
      // Sort by createdAt desc to get latest first
      const sortedListings = [...listingsUpToDate].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      for (const listing of sortedListings) {
        if (!latestListingsMap.has(listing.inscriptionId)) {
          latestListingsMap.set(listing.inscriptionId, listing);
        }
      }

      const latestListings = Array.from(latestListingsMap.values());

      // Filter for status='listed' and has priceSats
      const listedItems = latestListings.filter(
        (listing) => listing.status === 'listed' && listing.priceSats,
      );

      // Calculate floor price
      const floorPrice =
        listedItems.length > 0
          ? Math.min(...listedItems.map((l) => l.priceSats || 0))
          : 0;

      return {
        date: dateStr,
        floorPrice,
      };
    });

    return floorPriceHistory;
  }

  /**
   * Get collection floor price history (all time, daily) or all collections
   */
  async getCollectionFloorPriceHistory(collectionSymbol?: string) {
    // If no symbol provided, get all collections
    if (!collectionSymbol) {
      return this.getAllCollectionsFloorPriceHistory();
    }

    // Find collection by symbol
    const collection = await this.prisma.collections.findFirst({
      where: { symbol: collectionSymbol },
    });

    if (!collection) {
      throw new NotFoundException(
        `Collection with symbol "${collectionSymbol}" not found`,
      );
    }

    // Get all inscriptions in this collection
    const inscriptions = await this.prisma.inscriptions.findMany({
      where: { collectionId: collection.id },
    });

    if (inscriptions.length === 0) {
      return [];
    }

    const inscriptionIds = inscriptions.map((insc) => insc.id);

    // Get all listings for this collection ordered by date
    const allListings = await this.prisma.listings.findMany({
      where: {
        inscriptionId: { in: inscriptionIds },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (allListings.length === 0) {
      return [];
    }

    // Get date range
    const firstDate = new Date(allListings[0].createdAt);
    const lastDate = new Date();

    // Generate array of dates from first listing to today
    const dates: string[] = [];
    const currentDate = new Date(firstDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= lastDate) {
      dates.push(this.formatDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate floor price for each day
    const floorPriceHistory = dates.map((dateStr) => {
      // Get end of day
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all listings created up to end of this day
      const listingsUpToDate = allListings.filter(
        (listing) => listing.createdAt <= endOfDay,
      );

      // Group by inscriptionId and get latest status as of end of day
      const latestListingsMap = new Map();
      // Sort by createdAt desc to get latest first
      const sortedListings = [...listingsUpToDate].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      for (const listing of sortedListings) {
        if (
          listing.inscriptionId &&
          !latestListingsMap.has(listing.inscriptionId)
        ) {
          latestListingsMap.set(listing.inscriptionId, listing);
        }
      }

      const latestListings = Array.from(latestListingsMap.values());

      // Filter for status='listed' and has priceSats
      const listedItems = latestListings.filter(
        (listing) => listing.status === 'listed' && listing.priceSats,
      );

      // Calculate floor price
      const floorPrice =
        listedItems.length > 0
          ? Math.min(...listedItems.map((l) => l.priceSats || 0))
          : 0;

      return {
        date: dateStr,
        floorPrice,
      };
    });

    return floorPriceHistory;
  }

  /**
   * Get all collections floor price history
   */
  private async getAllCollectionsFloorPriceHistory() {
    const collections = await this.prisma.collections.findMany();

    const collectionsFloorPriceHistory = await Promise.all(
      collections.map(async (collection) => {
        const history = await this.getCollectionFloorPriceHistory(
          collection.symbol,
        );
        return {
          symbol: collection.symbol,
          name: collection.name,
          history,
        };
      }),
    );

    return collectionsFloorPriceHistory;
  }

  /**
   * Get PRC20 floor price history (all time, daily) or all tokens
   */
  async getPrc20FloorPriceHistory(tick?: string) {
    // If no tick provided, get all tokens
    if (!tick) {
      return this.getAllPrc20FloorPriceHistory();
    }

    // Get all prc20 listings for this tick ordered by date
    const allListings = await this.prisma.prc20Listings.findMany({
      where: { prc20Label: tick },
      orderBy: { createdAt: 'asc' },
    });

    if (allListings.length === 0) {
      return [];
    }

    // Get date range
    const firstDate = new Date(allListings[0].createdAt);
    const lastDate = new Date();

    // Generate array of dates from first listing to today
    const dates: string[] = [];
    const currentDate = new Date(firstDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= lastDate) {
      dates.push(this.formatDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate floor price for each day
    const floorPriceHistory = dates.map((dateStr) => {
      // Get end of day
      const endOfDay = new Date(dateStr);
      endOfDay.setHours(23, 59, 59, 999);

      // Get all listings created up to end of this day
      const listingsUpToDate = allListings.filter(
        (listing) => listing.createdAt <= endOfDay,
      );

      // Group by inscriptionId and get latest status as of end of day
      const latestListingsMap = new Map();
      // Sort by createdAt desc to get latest first
      const sortedListings = [...listingsUpToDate].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      for (const listing of sortedListings) {
        if (!latestListingsMap.has(listing.inscriptionId)) {
          latestListingsMap.set(listing.inscriptionId, listing);
        }
      }

      const latestListings = Array.from(latestListingsMap.values());

      // Filter for status='listed' and has priceSats and amount
      const listedItems = latestListings.filter(
        (listing) =>
          listing.status === 'listed' && listing.priceSats && listing.amount,
      );

      // Calculate floor price (per unit)
      const floorPrice =
        listedItems.length > 0
          ? Math.min(
              ...listedItems.map((l) => (l.priceSats || 0) / l.amount),
            )
          : 0;

      return {
        date: dateStr,
        floorPrice,
      };
    });

    return floorPriceHistory;
  }

  /**
   * Get all PRC20 tokens floor price history
   */
  private async getAllPrc20FloorPriceHistory() {
    // Get all unique prc20Labels
    const allListings = await this.prisma.prc20Listings.findMany({
      select: { prc20Label: true },
      distinct: ['prc20Label'],
    });

    const uniqueTicks = allListings.map((listing) => listing.prc20Label);

    const prc20FloorPriceHistory = await Promise.all(
      uniqueTicks.map(async (tick) => {
        const history = await this.getPrc20FloorPriceHistory(tick);
        return {
          tick,
          history,
        };
      }),
    );

    return prc20FloorPriceHistory;
  }

  /**
   * Get wallet history for a specific address
   * Returns all listings (NFT, Pepemap, PRC20) where the address is sellerAddress or buyerAddress
   * Only includes status: listed, unlisted, sold (excludes sent)
   */
  async getWalletHistory(address: string) {
    // Get NFT listings where address is seller or buyer
    const nftListings = await this.prisma.listings.findMany({
      where: {
        OR: [{ sellerAddress: address }, { buyerAddress: address }],
        status: {
          in: ['listed', 'unlisted', 'sold'],
        },
      },
      include: {
        inscription: {
          include: {
            collection: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get Pepemap listings where address is seller or buyer
    const pepemapListings = await this.prisma.pepemapListings.findMany({
      where: {
        OR: [{ sellerAddress: address }, { buyerAddress: address }],
        status: {
          in: ['listed', 'unlisted', 'sold'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get PRC20 listings where address is seller or buyer
    const prc20Listings = await this.prisma.prc20Listings.findMany({
      where: {
        OR: [{ sellerAddress: address }, { buyerAddress: address }],
        status: {
          in: ['listed', 'unlisted', 'sold'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform and combine all history
    const combinedHistory = [
      ...nftListings.map((listing) => ({
        type: 'nft' as const,
        id: listing.id,
        inscriptionId: listing.inscription?.inscriptionId || null,
        collectionName: listing.inscription?.collection?.name || null,
        collectionSymbol: listing.inscription?.collection?.symbol || null,
        status: listing.status,
        priceSats: listing.priceSats || 0,
        sellerAddress: listing.sellerAddress,
        buyerAddress: listing.buyerAddress,
        txid: listing.txid,
        createdAt: listing.createdAt,
      })),
      ...pepemapListings.map((listing) => ({
        type: 'pepemap' as const,
        id: listing.id,
        inscriptionId: listing.inscriptionId,
        pepemapLabel: listing.pepemapLabel,
        blockNumber: listing.blockNumber,
        status: listing.status,
        priceSats: listing.priceSats || 0,
        sellerAddress: listing.sellerAddress,
        buyerAddress: listing.buyerAddress,
        txid: listing.txid,
        createdAt: listing.createdAt,
      })),
      ...prc20Listings.map((listing) => ({
        type: 'prc20' as const,
        id: listing.id,
        inscriptionId: listing.inscriptionId,
        prc20Label: listing.prc20Label,
        amount: listing.amount,
        status: listing.status,
        priceSats: listing.priceSats || 0,
        sellerAddress: listing.sellerAddress,
        buyerAddress: listing.buyerAddress,
        txid: listing.txid,
        createdAt: listing.createdAt,
      })),
    ];

    // Sort by createdAt descending (most recent first)
    const sortedHistory = combinedHistory.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return sortedHistory;
  }

  /**
   * Get wallet activity for a specific address (PRC20 only)
   * Returns PRC20 listings where the address is sellerAddress or buyerAddress
   * Only includes status: sold, transfer
   */
  async getWalletActivity(address: string) {
    const prc20Activity = await this.prisma.prc20Listings.findMany({
      where: {
        OR: [{ sellerAddress: address }, { buyerAddress: address }],
        status: {
          in: ['sold', 'transfer'],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return prc20Activity;
  }
}
