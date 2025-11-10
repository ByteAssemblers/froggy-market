"use client";

import { HDWallet } from "./wallet/wallet";

// Backend API URL
const API_URL = "http://localhost:5555/api";

// Blockchain API URL
const BLOCKCHAIN_API = "http://localhost:7777";

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
        const response = await fetch(
          `${BLOCKCHAIN_API}/inscriptions/number/${inscriptionNumber}`
        );
        if (response.ok) {
          data = await response.json();
        }
      }
    } catch (e: any) {
      apiError = e.message;
    }

    // Method 2: Try direct inscription endpoint
    if (!data) {
      try {
        const response = await fetch(`${BLOCKCHAIN_API}/inscription/${inscriptionId}`);
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            data = await response.json();
          }
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
          `Please ensure blockchain API is running at ${BLOCKCHAIN_API}`
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
  const response = await fetch(`${API_URL}/listings/list`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sellerWif: wallet.privateKey,
      nftTxid: utxo.txid,
      nftVout: utxo.vout,
      priceSats: priceSats,
      sellerAddress: wallet.address,
      inscriptionId: inscriptionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to list NFT");
  }

  const result = await response.json();
  console.log("[listInscription] Success:", result);

  return result;
}

/**
 * Buy a listed NFT
 */
export async function buyListing(listingId: string, wallet: HDWallet) {
  if (!wallet || !wallet.privateKey) {
    throw new Error("Wallet not found");
  }

  const response = await fetch(`${API_URL}/listings/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listingId,
      buyerWif: wallet.privateKey,
      buyerReceiveAddress: wallet.address,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to buy NFT");
  }

  return response.json();
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

  const response = await fetch(`${API_URL}/listings/unlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inscriptionId,
      sellerAddress: wallet.address,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to cancel listing");
  }

  return response.json();
}

/**
 * Get all active listings
 */
export async function getActiveListings() {
  const response = await fetch(`${API_URL}/listings`);

  if (!response.ok) {
    throw new Error("Failed to fetch listings");
  }

  return response.json();
}

/**
 * Get listing by ID
 */
export async function getListingById(listingId: string) {
  const response = await fetch(`${API_URL}/listings/${listingId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch listing");
  }

  return response.json();
}

/**
 * Get inscription status
 */
export async function getInscriptionStatus(inscriptionId: string) {
  const response = await fetch(
    `${API_URL}/listings/inscription/${inscriptionId}/status`
  );

  if (!response.ok) {
    return null; // Not listed
  }

  return response.json();
}

/**
 * Get inscription listing history
 */
export async function getInscriptionHistory(inscriptionId: string) {
  const response = await fetch(
    `${API_URL}/listings/inscription/${inscriptionId}/history`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch history");
  }

  return response.json();
}
