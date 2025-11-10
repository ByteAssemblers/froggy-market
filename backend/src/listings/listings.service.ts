import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import pepeOrdSwap from '../lib/OrdSwap';
import { broadcastRawTxCore } from '../lib/inscribe';

@Injectable()
export class ListingsService {
  constructor(private prisma: PrismaService) {}

  // 🟢 List NFT
  async listNFT(dto: {
    sellerWif: string;
    nftTxid: string;
    nftVout: number;
    priceSats: number;
    sellerAddress: string;
    inscriptionId: string;
  }) {
    const {
      sellerWif,
      nftTxid,
      nftVout,
      priceSats,
      sellerAddress,
      inscriptionId,
    } = dto;

    // Find or create the inscription in database by blockchain inscriptionId
    let inscription = await this.prisma.inscriptions.findUnique({
      where: { inscriptionId },
    });

    if (!inscription) {
      // Create a standalone inscription without a collection
      // This allows users to list NFTs that aren't part of a collection yet
      inscription = await this.prisma.inscriptions.create({
        data: {
          inscriptionId,
          name: `Inscription #${inscriptionId.slice(0, 8)}`,
          collection: {
            create: {
              name: 'Standalone Listings',
              symbol: 'standalone',
              walletAddress: sellerAddress,
              approve: true,
            },
          },
        },
      });
    }

    // Build the seller PSBT
    console.log('[ListNFT] Building PSBT with params:', {
      nftTxid,
      nftVout,
      priceSats,
      sellerAddress,
      inscriptionId,
    });

    try {
      const listing = await pepeOrdSwap.buildSellerListingPsbt({
        sellerWif,
        nftTxid,
        nftVout,
        priceSats,
        sellerReceiveAddress: sellerAddress,
        postageSats: 100_000,
      });

      console.log('[ListNFT] PSBT built successfully:', {
        sellerAddress: listing.sellerAddress,
        sellerRecvAddress: listing.sellerRecvAddress,
        priceSats: listing.priceSats,
      });

      // Always create a NEW listing row (no update)
      const created = await this.prisma.listings.create({
        data: {
          inscriptionId: inscription.id,
          status: 'listed',
          psbtBase64: listing.psbtBase64,
          priceSats,
          sellerAddress: listing.sellerAddress || sellerAddress, // Use the derived address from PSBT, fallback to provided
          txid: nftTxid,
        },
      });

      return { ...created, sellerPsbt: listing.psbtBase64 };
    } catch (error) {
      // Enhanced error message for WIF mismatch
      if (error.message.includes('seller key does not control')) {
        throw new BadRequestException(
          `The private key provided does not control the NFT at ${nftTxid}:${nftVout}. ` +
            `Please make sure you're using the correct private key for the address that currently holds this NFT. ` +
            `Error: ${error.message}`,
        );
      }
      throw error;
    }
  }

  // 🟡 Buy NFT
  async buyNFT(dto: {
    listingId: string;
    buyerWif: string;
    buyerReceiveAddress?: string;
    platformAddress?: string;
    platformFeeSats?: number;
  }) {
    const {
      listingId,
      buyerWif,
      buyerReceiveAddress,
      platformAddress,
      platformFeeSats,
    } = dto;

    // 1. Find the active listing
    const listing = await this.prisma.listings.findUnique({
      where: { id: listingId },
      include: { inscription: true },
    });

    if (!listing) {
      throw new BadRequestException('Listing not found');
    }

    if (listing.status !== 'listed') {
      throw new BadRequestException('This listing is no longer active');
    }

    if (!listing.psbtBase64) {
      throw new BadRequestException('Listing PSBT is missing');
    }

    // 2. Complete the buyer transaction with the seller's PSBT
    const tx = await pepeOrdSwap.completeBuyerFromSellerPsbt({
      sellerPsbtBase64: listing.psbtBase64,
      buyerWif,
      buyerReceiveAddress,
      platformAddress: platformAddress || 'PFroggyMarketPlatformAddress123', // Replace with your platform address
      platformFeeSats: platformFeeSats || Math.round((listing.priceSats || 0) * 0.028), // 2.8% taker fee
      postageSats: 1_000_000,
      feeRate: 10000,
    });

    // 3. Broadcast the transaction to the blockchain
    await broadcastRawTxCore(tx.rawHex);

    // 4. Create a new "sold" record (event-sourced approach)
    const soldRecord = await this.prisma.listings.create({
      data: {
        inscriptionId: listing.inscriptionId,
        status: 'sold',
        psbtBase64: listing.psbtBase64,
        priceSats: listing.priceSats,
        sellerAddress: listing.sellerAddress,
        buyerAddress: tx.buyerAddress,
        txid: tx.txid,
      },
    });

    return {
      txid: tx.txid,
      listing: soldRecord,
      transaction: {
        buyerAddress: tx.buyerAddress,
        buyerReceiveAddress: tx.buyerReceiveAddress,
        sellerPriceSats: tx.sellerPriceSats,
        platformFeeSats: tx.platformFeeSats,
        postageSats: tx.postageSats,
        buyerChangeSats: tx.buyerChangeSats,
        splitTransactions: tx.splitTransactions,
      },
    };
  }

  // 🔴 Unlist NFT (old method - updates existing row)
  async unlistNFT(id: string) {
    const listing = await this.prisma.listings.findUnique({ where: { id } });
    if (!listing) throw new BadRequestException('Listing not found');
    if (listing.status !== 'listed')
      throw new BadRequestException('Only listed items can be unlisted');

    const updated = await this.prisma.listings.update({
      where: { id },
      data: { status: 'unlisted' },
    });

    return updated;
  }

  // 🔴 Unlist NFT by inscriptionId (creates new row with 'unlisted' status)
  async unlistByInscription(dto: {
    inscriptionId: string;
    sellerAddress: string;
  }) {
    const { inscriptionId, sellerAddress } = dto;

    // Find the inscription in database by blockchain inscriptionId
    const inscription = await this.prisma.inscriptions.findUnique({
      where: { inscriptionId },
    });

    if (!inscription) {
      throw new BadRequestException('Inscription not found in database');
    }

    // Create a NEW row with 'unlisted' status
    const created = await this.prisma.listings.create({
      data: {
        inscriptionId: inscription.id,
        status: 'unlisted',
        sellerAddress,
      },
    });

    return created;
  }

  // 🧾 Get listed (active) listings
  async getActiveListings() {
    // Use raw SQL to get only the latest status for each inscription
    // where the latest status is 'listed'
    const activeListings = await this.prisma.$queryRaw`
      WITH latest_listings AS (
        SELECT DISTINCT ON ("inscriptionId")
          id,
          "inscriptionId",
          status,
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

  // 🔍 Get listing by ID with full details
  async getListingById(id: string) {
    return this.prisma.listings.findUnique({
      where: { id },
      include: {
        inscription: {
          include: {
            collection: true,
          },
        },
      },
    });
  }

  // 📊 Get latest status for an inscription
  async getLatestListingStatus(inscriptionId: string) {
    return this.prisma.listings.findFirst({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 📜 Get full history for an inscription
  async getInscriptionHistory(inscriptionId: string) {
    return this.prisma.listings.findMany({
      where: { inscriptionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInscriptionsByWallet(walletAddress: string) {
    // Fetch all pages from blockchain API
    let page = 1;
    let allInscriptions: any = [];
    let continueFetching = true;

    while (continueFetching) {
      const response = await fetch(
        `http://localhost:7777/inscriptions/balance/${walletAddress}/${page}`
      );
      const data = await response.json();

      if (data.inscriptions && data.inscriptions.length > 0) {
        allInscriptions = [...allInscriptions, ...data.inscriptions];
        page++;
      } else {
        continueFetching = false;
      }
    }

    // Get all inscriptionIds from database
    const dbInscriptions = await this.prisma.inscriptions.findMany({
      select: {
        inscriptionId: true,
        name: true,
        attributes: true,
        createdAt: true,
        updatedAt: true,
        collection: {
          select: {
            id: true,
            name: true,
            symbol: true,
            description: true,
            profileInscriptionId: true,
          },
        },
        listings: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    // Create a map of inscriptionId -> database data
    const dbMap = new Map(
      dbInscriptions.map((i) => [i.inscriptionId, i])
    );

    // Filter blockchain NFTs to only include those in database
    const filteredNFTs = allInscriptions.filter((nft: any) =>
      dbMap.has(nft.inscription_id)
    );

    // Merge blockchain data with database metadata
    const mergedNFTs = filteredNFTs.map((nft: any) => {
      const dbData = dbMap.get(nft.inscription_id);
      return {
        ...nft,
        dbMetadata: dbData,
      };
    });

    // Sort by timestamp descending
    mergedNFTs.sort((a: any, b: any) => b.timestamp - a.timestamp);

    return mergedNFTs;
  }
}
