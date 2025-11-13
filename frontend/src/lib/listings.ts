"use client";

import { HDWallet } from "./wallet/wallet";
import { apiClient, blockchainClient } from "./axios";

/**
 * Get the current UTXO location of an inscription
 */
export async function getInscriptionUTXO(inscriptionId: string) {
  try {
    // Try multiple API endpoints to get inscription data
    let data: any = null;
    let apiError: string = "";

    // Method 1: Try the inscriptions/balance endpoint from backend
    try {
      const inscriptionNumber = inscriptionId.match(/i(\d+)$/)?.[1];
      if (inscriptionNumber) {
        const response = await blockchainClient.get(
          `/inscriptions/number/${inscriptionNumber}`
        );
        data = response.data;
      }
    } catch (e: any) {
      apiError = e.message;
    }

    // Method 2: Try direct inscription endpoint
    if (!data) {
      try {
        const response = await blockchainClient.get(`/inscription/${inscriptionId}`);
        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes("application/json")) {
          data = response.data;
        }
      } catch (e: any) {
        apiError = e.message;
      }
    }

    // Method 3: Parse from inscriptionId directly
    if (!data) {
      // InscriptionId format: txid + "i" + vout
      // Example: "abc123...i0"
      const parts = inscriptionId.split("i");
      if (parts.length === 2) {
        console.warn(
          "[getInscriptionUTXO] Could not fetch from API, using inscriptionId parsing"
        );
        return {
          txid: parts[0],
          vout: parseInt(parts[1]),
          address: "", // Will be verified on backend
          value: 100_000,
          inscriptionNumber: 0,
        };
      } else {
        throw new Error(
          `Cannot parse inscription location. API error: ${apiError}. ` +
          `Please ensure blockchain API is running at ${blockchainClient.defaults.baseURL}`
        );
      }
    }

    // Parse the response data
    return {
      txid: data.genesis_txid || data.genesis_tx || data.txid || inscriptionId.split("i")[0],
      vout: data.genesis_vout !== undefined ? data.genesis_vout : (data.vout !== undefined ? data.vout : parseInt(inscriptionId.split("i")[1] || "0")),
      address: data.address || data.current_location || "",
      value: data.value || data.output_value || 100_000,
      inscriptionNumber: data.inscription_number || data.number || 0,
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch inscription location: ${error.message}`);
  }
}

/**
 * List an NFT for sale
 */
export async function listInscription(
  inscriptionId: string,
  priceSats: number,
  wallet: HDWallet
) {
  if (!wallet || !wallet.privateKey) {
    throw new Error("Wallet not found. Please create or import a wallet first.");
  }

  console.log("[listInscription] Starting with:", {
    inscriptionId,
    priceSats,
    walletAddress: wallet.address,
  });

  // Step 1: Get the UTXO location of the inscription
  const utxo = await getInscriptionUTXO(inscriptionId);

  console.log("[listInscription] UTXO location:", utxo);

  // Step 2: Verify wallet controls this address (skip if address is empty from fallback)
  if (utxo.address && wallet.address !== utxo.address) {
    throw new Error(
      `You don't control this NFT.\n\n` +
      `NFT is at: ${utxo.address}\n` +
      `Your wallet: ${wallet.address}\n\n` +
      `Please ensure the NFT is in your wallet before listing.`
    );
  }

  if (utxo.address) {
    console.log("[listInscription] Wallet verification passed");
  } else {
    console.warn("[listInscription] Skipping wallet verification - address unknown. Backend will verify via PSBT signing.");
  }

  // Step 3: Call backend to create listing
  try {
    const response = await apiClient.post('/listings/list', {
      sellerWif: wallet.privateKey,
      nftTxid: utxo.txid,
      nftVout: utxo.vout,
      priceSats: priceSats,
      sellerAddress: wallet.address,
      inscriptionId: inscriptionId,
    });

    console.log("[listInscription] Success:", response.data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to list NFT");
  }
}

/**
 * Buy a listed NFT
 */
export async function buyListing(listingId: string, wallet: HDWallet) {
  if (!wallet || !wallet.privateKey) {
    throw new Error("Wallet not found");
  }

  try {
    const response = await apiClient.post('/listings/buy', {
      listingId,
      buyerWif: wallet.privateKey,
      buyerReceiveAddress: wallet.address,
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to buy NFT");
  }
}

/**
 * Cancel/unlist an NFT
 */
export async function cancelListing(
  inscriptionId: string,
  wallet: HDWallet
) {
  if (!wallet || !wallet.privateKey) {
    throw new Error("Wallet not found");
  }

  try {
    const response = await apiClient.post('/listings/unlist', {
      inscriptionId,
      sellerAddress: wallet.address,
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to cancel listing");
  }
}

/**
 * Get all active listings
 */
export async function getActiveListings() {
  try {
    const response = await apiClient.get('/listings');
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch listings");
  }
}

/**
 * Get listing by ID
 */
export async function getListingById(listingId: string) {
  try {
    const response = await apiClient.get(`/listings/${listingId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch listing");
  }
}

/**
 * Get inscription status
 */
export async function getInscriptionStatus(inscriptionId: string) {
  try {
    const response = await apiClient.get(`/listings/inscription/${inscriptionId}/status`);
    return response.data;
  } catch (error) {
    return null; // Not listed
  }
}

/**
 * Get inscription listing history
 */
export async function getInscriptionHistory(inscriptionId: string) {
  try {
    const response = await apiClient.get(`/listings/inscription/${inscriptionId}/history`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch history");
  }
}
