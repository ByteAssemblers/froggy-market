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
    const listing = await pepeOrdSwap.buildSellerListingPsbt({
      sellerWif,
      nftTxid,
      nftVout,
      priceSats,
      sellerReceiveAddress: sellerAddress,
      postageSats: 100_000,
    });

    // Always create a NEW listing row (no update)
    const created = await this.prisma.listings.create({
      data: {
        inscriptionId: inscription.id,
        status: 'listed',
        psbtBase64: listing.psbtBase64,
        priceSats,
        sellerAddress,
        txid: nftTxid,
      },
    });

    return { ...created, sellerPsbt: listing.psbtBase64 };
  }

  // 🟡 Buy NFT
  async buyNFT(dto: {
    sellerPsbtBase64: string;
    buyerWif: string;
    buyerReceiveAddress: string;
    platformAddress: string;
    platformFeeSats: number;
    listingId: string;
  }) {
    const {
      sellerPsbtBase64,
      buyerWif,
      buyerReceiveAddress,
      platformAddress,
      platformFeeSats,
      listingId,
    } = dto;

    const tx = await pepeOrdSwap.completeBuyerFromSellerPsbt({
      sellerPsbtBase64,
      buyerWif,
      buyerReceiveAddress,
      platformAddress,
      platformFeeSats,
    });

    await broadcastRawTxCore(tx.rawHex);

    const updated = await this.prisma.listings.update({
      where: { id: listingId },
      data: {
        status: 'sold',
        buyerAddress: tx.buyerAddress,
        txid: tx.txid,
      },
    });

    return { txid: tx.txid, updated };
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
    return this.prisma.listings.findMany({
      where: { status: 'listed' },
      include: {
        inscription: {
          include: {
            collection: true,
          },
        },
      },
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
