"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { decryptWallet } from "@/lib/wallet/storage";
import { blockchainClient, apiClient, baseClient } from "@/lib/axios";
import axios from "axios";

export const useProfile = () => {
  const queryClient = useQueryClient();
  const [wallet, setWallet] = useState<any>(null);
  const [mnemonic, setMnemonic] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [isLocked, setIsLocked] = useState(true); // Default to locked for security
  const [hasSavedWallet, setHasSavedWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [walletState, setWalletState] = useState<
    "empty" | "password" | "import" | "secret" | "mywallet" | "send" | "lock"
  >("empty");
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [listingStatuses, setListingStatuses] = useState<Map<string, any>>(
    new Map(),
  );
  const [pepemapListingStatuses, setPepemapListingStatuses] = useState<
    Map<string, any>
  >(new Map());
  const [prc20ListingStatuses, setPrc20ListingStatuses] = useState<
    Map<string, any>
  >(new Map());

  // Fetch my wallet nft from wonky-ord
  const {
    data: myWalletNft,
    isLoading: isMyWalletNftLoading,
    error: myWalletNftError,
  } = useQuery({
    queryKey: ["myWalletNft", walletAddress],
    queryFn: async (): Promise<any> => {
      try {
        let page = 1;
        let allInscriptions: any = [];
        let continueFetching = true;

        // Fetch all pages of inscriptions
        while (continueFetching) {
          const response = await blockchainClient.get(
            `/inscriptions/balance/${walletAddress}/${page}`,
          );
          
          const data = response.data.inscriptions;

          if (data && data.length > 0) {
            allInscriptions = [...allInscriptions, ...data];
            page++;
          } else {
            continueFetching = false;
          }
        }

        allInscriptions.sort((a: any, b: any) => b.timestamp - a.timestamp);
        setInscriptions(allInscriptions);

        // Fetch listing status for all inscriptions in parallel
        const statusMap = new Map();
        const pepemapStatusMap = new Map();

        // Create array of promises for parallel fetching
        const statusPromises = allInscriptions.map(async (inscription: any) => {
          // Check if it's a pepemap
          const isPepemap =
            typeof inscription.content === "string" &&
            inscription.content.endsWith(".pepemap");

          if (isPepemap) {
            // Fetch pepemap listing status
            try {
              const statusResponse = await apiClient.get(
                `/pepemap-listings/inscription/${inscription.inscription_id}`,
              );
              return {
                id: inscription.inscription_id,
                type: "pepemap",
                data: statusResponse.data,
              };
            } catch (err) {
              return {
                id: inscription.inscription_id,
                type: "pepemap",
                data: { status: null, listing: null },
              };
            }
          } else {
            // Fetch regular NFT listing status
            try {
              const statusResponse = await apiClient.get(
                `/listings/inscription/${inscription.inscription_id}`,
              );
              return {
                id: inscription.inscription_id,
                type: "listing",
                data: statusResponse.data,
              };
            } catch (err) {
              return {
                id: inscription.inscription_id,
                type: "listing",
                data: { status: null, listing: null },
              };
            }
          }
        });

        // Wait for all status fetches to complete
        const statusResults = await Promise.all(statusPromises);

        // Populate the maps
        statusResults.forEach((result) => {
          if (result.type === "pepemap") {
            pepemapStatusMap.set(result.id, result.data);
          } else {
            statusMap.set(result.id, result.data);
          }
        });

        setListingStatuses(statusMap);
        setPepemapListingStatuses(pepemapStatusMap);

        // Return the data
        return {
          inscriptions: allInscriptions,
          listingStatuses: statusMap,
          pepemapListingStatuses: pepemapStatusMap,
        };
      } catch (error) {
        console.error("Error fetching inscriptions:", error);
        return {
          inscriptions: [],
          listingStatuses: new Map(),
          pepemapListingStatuses: new Map(),
        };
      }
    },
    enabled: !!walletAddress,
    staleTime: 1 * 60 * 1000,
  });

  // Fetch wallet PRC-20 tokens
  const {
    data: myWalletPrc20,
    isLoading: isMyWalletPrc20Loading,
    error: myWalletPrc20Error,
  } = useQuery({
    queryKey: ["myWalletPrc20", walletAddress],
    queryFn: async (): Promise<any> => {
      try {
        const response = await fetch(`/api/belindex/address/${walletAddress}`);
        const tokens = await response.json();

        // Fetch detailed balance for each token
        const tokensWithTransfers = await Promise.all(
          tokens.map(async (token: any) => {
            try {
              const balanceResponse = await baseClient.get(
                `belindex/address/${walletAddress}/${token.tick}/balance`,
              );
              const balanceData = balanceResponse.data;
              return {
                ...token,
                transfers: balanceData.transfers || [],
              };
            } catch (error) {
              console.error(`Failed to fetch balance for ${token.tick}:`, error);
              return {
                ...token,
                transfers: [],
              };
            }
          }),
        );

        // Collect all transfers from all tokens
        const allTransfers = tokensWithTransfers.flatMap(
          (token) => token.transfers,
        );

        // Fetch listing status for all transfers in parallel
        const statusMap = new Map();
        const statusPromises = allTransfers.map(async (transfer: any) => {
          const inscriptionId = transfer.outpoint.split(":")[0] + "i0";
          try {
            const statusResponse = await apiClient.get(
              `/prc20-listings/inscription/${inscriptionId}`,
            );
            return {
              id: inscriptionId,
              data: statusResponse.data,
            };
          } catch (error) {
            return {
              id: inscriptionId,
              data: { status: null, listing: null },
            };
          }
        });

        // Wait for all status fetches to complete
        const statusResults = await Promise.all(statusPromises);

        // Populate the status map
        statusResults.forEach((result) => {
          statusMap.set(result.id, result.data);
        });

        setPrc20ListingStatuses(statusMap);

        return tokensWithTransfers;
      } catch (error) {
        console.error("Error fetching prc-20:", error);
        return [];
      }
    },
    enabled: !!walletAddress,
    staleTime: 1 * 60 * 1000,
  });

  // Fetch wallet pepemaps
  const {
    data: myWalletPepemaps,
    isLoading: isMyWalletPepemapsLoading,
    error: myWalletPepemapsError,
  } = useQuery({
    queryKey: ["myWalletPepemaps", walletAddress],
    queryFn: async (): Promise<any> => {
      try {
        const response = await blockchainClient.get(
          `pepemap/address/${walletAddress}`,
        );
        return response.data;
      } catch (error) {
        console.error("Error fetching pepemap:", error);
        return [];
      }
    },
    enabled: !!walletAddress,
    staleTime: 1 * 60 * 1000,
  });

  // Fetch biggest-sales-of-day from backend
  const {
    data: biggestSalesOfDay,
    isLoading: isBiggestSalesOfDayLoading,
    error: biggestSalesOfDayError,
  } = useQuery({
    queryKey: ["biggestSalesOfDay"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get(
          "/informations/biggest-sales-of-day",
        );
        return response.data;
      } catch (error) {
        console.error("Failed to fetch biggest sales of day:", error);
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch prc20-info from backend
  const {
    data: prc20Info,
    isLoading: isPrc20InfoLoading,
    error: prc20InfoError,
  } = useQuery({
    queryKey: ["prc20Info"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/informations/prc20-info");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch prc20 info:", error);
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch collection-info from backend
  const {
    data: collectionInfo,
    isLoading: isCollectionInfoLoading,
    error: collectionInfoError,
  } = useQuery({
    queryKey: ["collectionInfo"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/informations/collection-info");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch collection info:", error);
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch pepemap-info from backend
  const {
    data: pepemapInfo,
    isLoading: isPepemapInfoLoading,
    error: pepemapInfoError,
  } = useQuery({
    queryKey: ["pepemapInfo"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/informations/pepemap-info");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch pepemap info:", error);
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch marketplace-stats from backend
  const {
    data: marketplaceStats,
    isLoading: isMarketplaceStatsLoading,
    error: marketplaceStatsError,
  } = useQuery({
    queryKey: ["marketplaceStats"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/informations/marketplace-stats");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch marketplace stats:", error);
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch active prc20s listings from backend
  const {
    data: prc20,
    isLoading: isPrc20Loading,
    error: prc20Error,
  } = useQuery({
    queryKey: ["prc20"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/prc20-listings/active");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch prc20 listings:", error);
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch active pepemap listings from backend
  const {
    data: pepemaps,
    isLoading: isPepemapsLoading,
    error: pepemapsError,
  } = useQuery({
    queryKey: ["pepemaps"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/pepemap-listings/active");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch pepemap listings:", error);
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch collections data
  const {
    data: collections,
    isLoading: isCollectionsLoading,
    error: collectionsError,
  } = useQuery({
    queryKey: ["collections"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/collections");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch collections:", error);
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch pepecoin price
  const {
    data: pepecoinPrice,
    isLoading: isPepecoinPriceLoading,
    error: pepecoinPriceError,
  } = useQuery({
    queryKey: ["pepecoinprice"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await axios.get(
          "https://pepeblocks.com/ext/getcurrentprice",
        );
        return response.data;
      } catch (error) {
        console.error("Failed to fetch Pepecoin price:", error);
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch prc-20
  const {
    data: tokens,
    isLoading: isTokensLoading,
    error: tokensError,
  } = useQuery({
    queryKey: ["prc-20"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await baseClient.get("/belindex/tokens?page_size=100");
        return response.data.tokens || [];
      } catch (err) {
        console.error("Error fetching tokens:", err);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch pepemap activity from backend
  const {
    data: pepemapActivity,
    isLoading: isPepemapActivityLoading,
    error: pepemapActivityError,
  } = useQuery({
    queryKey: ["pepemapActivity"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/pepemap-listings/activity");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch pepemap activity:", error);
        return [];
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch listings activity from backend
  const {
    data: listingsActivity,
    isLoading: isListingsActivityLoading,
    error: listingsActivityError,
  } = useQuery({
    queryKey: ["listingsActivity"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/listings/activity");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch listings activity:", error);
        return [];
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch prc20 activity from backend
  const {
    data: prc20Activity,
    isLoading: isPrc20ActivityLoading,
    error: prc20ActivityError,
  } = useQuery({
    queryKey: ["prc20Activity"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/prc20-listings/activity");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch prc20 activity:", error);
        return [];
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch pepemap floor price from backend
  const {
    data: pepemapFloorPrice,
    isLoading: isPepemapFloorPriceLoading,
    error: pepemapFloorPriceError,
  } = useQuery({
    queryKey: ["pepemapFloorPrice"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get(
          "/informations/pepemap-floorprice",
        );
        return response.data;
      } catch (error) {
        console.error("Failed to fetch pepemap floor price:", error);
        return null;
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch collection floor price from backend
  const {
    data: collectionFloorPrice,
    isLoading: isCollectionFloorPriceLoading,
    error: collectionFloorPriceError,
  } = useQuery({
    queryKey: ["collectionFloorPrice"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get(
          "/informations/collection-floorprice",
        );
        return response.data;
      } catch (error) {
        console.error("Failed to fetch collection floor price:", error);
        return null;
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch prc20 floor price from backend
  const {
    data: prc20FloorPrice,
    isLoading: isPrc20FloorPriceLoading,
    error: prc20FloorPriceError,
  } = useQuery({
    queryKey: ["prc20FloorPrice"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/informations/prc20-floorprice");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch prc20 floor price:", error);
        return null;
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch prc20 transaction from backend
  const {
    data: prc20Transaction,
    isLoading: isPrc20TransactionLoading,
    error: prc20TransactionError,
  } = useQuery({
    queryKey: ["prc20Transaction"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await apiClient.get("/prc20-listings/transaction");
        return response.data;
      } catch (error) {
        console.error("Failed to fetch prc20 transaction:", error);
        return null;
      }
    },
  });

  // Wallet info mutataion
  const walletInfoMutation = useMutation({
    mutationFn: async (): Promise<any> => {
      const stored = localStorage.getItem("pepecoin_wallet");
      const backedUp = localStorage.getItem("pepecoin_wallet_backed_up");
      const unlockedSession = sessionStorage.getItem(
        "pepecoin_wallet_unlocked",
      );

      if (backedUp === "true") {
        setHasBackedUp(true);
      }

      if (stored) {
        const parsed = JSON.parse(stored);
        setHasSavedWallet(true);

        // Check if wallet is unlocked in session first
        if (unlockedSession) {
          try {
            const unlockedWallet = JSON.parse(unlockedSession);
            console.log(
              "✅ Wallet unlocked in session:",
              unlockedWallet.address,
            );
            setWallet(unlockedWallet);
            setWalletAddress(unlockedWallet.address);
            setMnemonic(unlockedWallet.mnemonic || "");
            setPrivateKey(unlockedWallet.privateKey);
            setIsLocked(false);
            setWalletState("mywallet");
            return {};
          } catch (err) {
            console.error("Failed to parse unlocked session", err);
          }
        }

        // If not in session, check if password protected
        if (parsed.passwordProtected) {
          console.log("🔒 Wallet is locked (password protected)");
          setIsLocked(true);
          setWalletState("lock");
          setWallet(null);
          setWalletAddress(parsed.address || "");
          setMnemonic("");
          setPrivateKey("");
        } else {
          // Wallet has no password, auto-unlock
          try {
            const w = await decryptWallet(parsed, "");
            setWallet(w);
            setWalletAddress(w.address);
            setMnemonic(w.mnemonic);
            setPrivateKey(w.privateKey);
            setIsLocked(false);
            setWalletState("mywallet");
          } catch (err) {
            console.error("Auto-unlock failed", err);
            setIsLocked(true);
            setWalletState("lock");
          }
        }
      } else {
        // No wallet
        setHasSavedWallet(false);
        setIsLocked(false);
        setWallet(null);
        setWalletAddress("");
        setMnemonic("");
        setPrivateKey("");
        setWalletState("empty");
      }

      return {};
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["wallet"], data);
    },
    onError: (error: any) => {
      console.error("Wallet info update failed:", error);
    },
  });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["collections"] });
    queryClient.invalidateQueries({ queryKey: ["pepecoinprice"] });
    queryClient.invalidateQueries({ queryKey: ["pepemaps"] });
  };

  // Auto-initialize wallet state on mount
  useEffect(() => {
    // Clear unlocked session on page refresh for security
    // This ensures wallet is locked after every refresh
    sessionStorage.removeItem("pepecoin_wallet_unlocked");
    console.log("🔒 Page loaded - wallet locked");

    walletInfoMutation.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Data
    prc20,
    pepemaps,
    collections,
    pepecoinPrice,
    tokens,
    marketplaceStats,
    pepemapInfo,
    collectionInfo,
    prc20Info,
    biggestSalesOfDay,
    pepemapActivity,
    listingsActivity,
    prc20Activity,
    pepemapFloorPrice,
    collectionFloorPrice,
    prc20FloorPrice,
    prc20Transaction,
    myWalletNft,
    inscriptions,
    listingStatuses,
    pepemapListingStatuses,
    prc20ListingStatuses,
    myWalletPrc20,
    myWalletPepemaps,

    // Loading states
    isPrc20Loading,
    isPepemapsLoading,
    isCollectionsLoading,
    isPepecoinPriceLoading,
    isTokensLoading,
    isMarketplaceStatsLoading,
    isPepemapInfoLoading,
    isCollectionInfoLoading,
    isPrc20InfoLoading,
    isBiggestSalesOfDayLoading,
    isPepemapActivityLoading,
    isListingsActivityLoading,
    isPrc20ActivityLoading,
    isPepemapFloorPriceLoading,
    isCollectionFloorPriceLoading,
    isPrc20FloorPriceLoading,
    isPrc20TransactionLoading,
    isMyWalletNftLoading,
    isMyWalletPrc20Loading,
    isMyWalletPepemapsLoading,

    // Errors
    prc20Error,
    pepemapsError,
    collectionsError,
    pepecoinPriceError,
    tokensError,
    marketplaceStatsError,
    pepemapInfoError,
    collectionInfoError,
    prc20InfoError,
    biggestSalesOfDayError,
    pepemapActivityError,
    listingsActivityError,
    prc20ActivityError,
    pepemapFloorPriceError,
    collectionFloorPriceError,
    prc20FloorPriceError,
    prc20TransactionError,
    myWalletNftError,
    myWalletPrc20Error,
    myWalletPepemapsError,

    // Mutations
    walletInfo: walletInfoMutation.mutate,

    // Mutation loading states
    isWalletInfo: walletInfoMutation.isPending,

    wallet,
    mnemonic,
    privateKey,
    isLocked,
    hasSavedWallet,
    walletAddress,
    hasBackedUp,
    walletState,

    // Utility functions
    refetchAll,
  };
};
