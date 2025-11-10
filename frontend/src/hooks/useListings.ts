"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  listInscription,
  buyListing,
  cancelListing,
  getInscriptionUTXO,
} from "@/lib/listings";
import { HDWallet } from "@/lib/wallet/wallet";

export function useListings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * List an NFT for sale
   */
  const list = async (
    inscriptionId: string,
    priceInPepe: number,
    wallet: HDWallet
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Convert PEPE to satoshis (1 PEPE = 100,000,000 sats)
      const priceSats = Math.round(priceInPepe * 100_000_000);

      console.log(`[useListings] Listing ${inscriptionId} for ${priceSats} sats`);

      const result = await listInscription(inscriptionId, priceSats, wallet);

      toast.success("NFT listed successfully!", {
        description: `Price: ${priceInPepe} PEPE`,
      });

      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to list NFT";
      setError(errorMessage);

      toast.error("Failed to list NFT", {
        description: errorMessage,
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Buy a listed NFT
   */
  const buy = async (listingId: string, wallet: HDWallet) => {
    setLoading(true);
    setError(null);

    try {
      const result = await buyListing(listingId, wallet);

      toast.success("NFT purchased successfully!", {
        description: `Transaction: ${result.txid.slice(0, 10)}...`,
      });

      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to buy NFT";
      setError(errorMessage);

      toast.error("Failed to buy NFT", {
        description: errorMessage,
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel a listing
   */
  const unlist = async (inscriptionId: string, wallet: HDWallet) => {
    setLoading(true);
    setError(null);

    try {
      const result = await cancelListing(inscriptionId, wallet);

      toast.success("Listing cancelled successfully!");

      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to cancel listing";
      setError(errorMessage);

      toast.error("Failed to cancel listing", {
        description: errorMessage,
      });

      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user owns an inscription
   */
  const checkOwnership = async (inscriptionId: string, wallet: HDWallet) => {
    try {
      const utxo = await getInscriptionUTXO(inscriptionId);
      return utxo.address === wallet.address;
    } catch (err) {
      console.error("Failed to check ownership:", err);
      return false;
    }
  };

  return {
    list,
    buy,
    unlist,
    checkOwnership,
    loading,
    error,
  };
}
