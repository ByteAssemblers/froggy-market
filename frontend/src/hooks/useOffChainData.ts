"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, baseClient } from "@/lib/axios";
import {
  Prc20Token,
  Prc20Info,
  Prc20Active,
  Prc20Activity,
  Prc20FloorPrice,
  Prc20Transaction,
} from "@/types/prc20";
import {
  FloorPrice,
  PepemapActive,
  PepemapActivity,
  PepemapInfo,
} from "@/types/pepemap";
import {
  Activities,
  CollectionActive,
  CollectionActivity,
  CollectionFloorPrice,
  CollectionInfo,
} from "@/types/collections";

export interface Pepemap {
  pepemapInfo: PepemapInfo;
  pepemapActive: PepemapActive[];
  pepemapActivity: PepemapActivity[];
  pepemapFloorPrice: FloorPrice[];
}

export interface Collcetions {
  collectionsInfo: CollectionInfo[];
  collectionsActive: CollectionActive[];
  collectionsActivity: CollectionActivity[];
  collectionsFloorPrice: CollectionFloorPrice[];
}

export interface Collection {
  collectionInfo: CollectionInfo;
  collectionActive: CollectionActive;
  collectionActivity: Activities[];
  collectionFloorPrice: FloorPrice[];
}

export interface Prc20s {
  prc20sToken: Prc20Token[];
  prc20sInfo: Prc20Info[];
  prc20sActive: Prc20Active[];
  prc20sActivity: Prc20Activity[];
  prc20sFloorPrice: Prc20FloorPrice[];
  prc20sTransaction: Prc20Transaction[];
}

interface UseOffchainParams {
  collectionId?: string;
  prcId?: string;
}

export const useOffChainData = <Any>(params: UseOffchainParams) => {
  const { collectionId, prcId } = params;

  // Fetch Pepemap from offchain database
  const {
    data: pepemap,
    isLoading: isPepemapLoading,
    error: pepemapError,
  } = useQuery({
    queryKey: ["#pepemap"],
    queryFn: async (): Promise<Pepemap> => {
      try {
        const pepemapInfo = await apiClient.get("/informations/pepemap-info");
        const pepemapActive = await apiClient.get("/pepemap-listings/active");
        const pepemapActivity = await apiClient.get(
          "/pepemap-listings/activity",
        );
        const pepemapFloorPrice = await apiClient.get(
          "/informations/pepemap-floorprice",
        );
        return {
          pepemapInfo: pepemapInfo.data,
          pepemapActive: pepemapActive.data,
          pepemapActivity: pepemapActivity.data,
          pepemapFloorPrice: pepemapFloorPrice.data,
        };
      } catch (error) {
        console.error("Failed to fetch pepemap:", error);
        return {
          pepemapInfo: {
            floorPrice: 0,
            change24h: 0,
            volume24h: 0,
            totalVolume: 0,
            trades24h: 0,
            listed: 0,
          },
          pepemapActive: [],
          pepemapActivity: [],
          pepemapFloorPrice: [],
        };
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch Collections from offchain database
  const {
    data: collections,
    isLoading: isCollectionsLoading,
    error: collectionsError,
  } = useQuery({
    queryKey: ["#collections"],
    queryFn: async (): Promise<Collcetions> => {
      try {
        const collectionsInfo = await apiClient.get(
          "/informations/collection-info",
        );
        const collectionsActive = await apiClient.get("/collections");
        const collectionsActivity = await apiClient.get("/listings/activity");
        const collectionsFloorPrice = await apiClient.get(
          "/informations/collection-floorprice",
        );

        return {
          collectionsInfo: collectionsInfo.data,
          collectionsActive: collectionsActive.data,
          collectionsActivity: collectionsActivity.data,
          collectionsFloorPrice: collectionsFloorPrice.data,
        };
      } catch (error) {
        console.error("Failed to fetch collections", error);
        return {
          collectionsInfo: [],
          collectionsActive: [],
          collectionsActivity: [],
          collectionsFloorPrice: [],
        };
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch Collection from offchain database
  const {
    data: collection,
    isLoading: isCollectionLoading,
    error: collectionError,
  } = useQuery({
    queryKey: ["#collection", collectionId],
    enabled: !!collectionId,
    queryFn: async (): Promise<Collection> => {
      try {
        const collectionInfo = await apiClient.get(
          `/informations/collection-info?nft=${collectionId}`,
        );
        const collectionsActive = await apiClient.get("/collections");
        const collectionActivity = await apiClient.get(
          `/listings/activity?collection=${collectionId}`,
        );
        const collectionFloorPrice = await apiClient.get(
          `/informations/collection-floorprice?nft=${collectionId}`,
        );
        return {
          collectionInfo: collectionInfo.data,
          collectionActive: collectionsActive.data.find(
            (i: any) => i.symbol === collectionId,
          ),
          collectionActivity: collectionActivity.data,
          collectionFloorPrice: collectionFloorPrice.data,
        };
      } catch (error) {
        console.error("Failed to fetch collections", error);
        return {
          collectionInfo: {
            floorPrice: 0,
            change24h: 0,
            volume24h: 0,
            totalVolume: 0,
            trades24h: 0,
            owners: 0,
            supply: 0,
            listed: 0,
          },
          collectionActive: {
            id: "",
            name: "",
            symbol: "",
            description: "",
            profileInscriptionId: "",
            socialLink: "",
            personalLink: "",
            totalSupply: 0,
            walletAddress: "",
            approve: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            inscriptions: [],
          },
          collectionActivity: [],
          collectionFloorPrice: [],
        };
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch Prc20s from offchain database
  const {
    data: prc20s,
    isLoading: isPrc20sLoading,
    error: prc20sError,
  } = useQuery({
    queryKey: ["#prc20s"],
    queryFn: async (): Promise<Prc20s> => {
      try {
        const prc20sToken = await baseClient.get(
          "/belindex/tokens?page_size=100",
        );
        const prc20sInfo = await apiClient.get("/informations/prc20-info");
        const prc20sActive = await apiClient.get("/prc20-listings/active");
        const prc20sActivity = await apiClient.get("/prc20-listings/activity");
        const prc20sFloorPrice = await apiClient.get(
          "/informations/prc20-floorprice",
        );
        const prc20sTransaction = await apiClient.get(
          "/prc20-listings/transaction",
        );
        return {
          prc20sToken: prc20sToken.data.tokens,
          prc20sInfo: prc20sInfo.data,
          prc20sActive: prc20sActive.data,
          prc20sActivity: prc20sActivity.data,
          prc20sFloorPrice: prc20sFloorPrice.data,
          prc20sTransaction: prc20sTransaction.data,
        };
      } catch (error) {
        console.error("Failed to fetch prc20s", error);
        return {
          prc20sToken: [],
          prc20sInfo: [],
          prc20sActive: [],
          prc20sActivity: [],
          prc20sFloorPrice: [],
          prc20sTransaction: [],
        };
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch Prc20 from offchain database
  const {
    data: prc20,
    isLoading: isPrc20Loading,
    error: prc20Error,
  } = useQuery({
    queryKey: ["#prc20", prcId],
    enabled: !!prcId,
    queryFn: async (): Promise<any> => {
      try {
        const prc20Token = await baseClient.get(
          `/belindex/token?tick=${prcId}`,
        );
        const prc20Info = await apiClient.get(
          `/informations/prc20-info?tick=${prcId}`,
        );
        const prc20sActive = await apiClient.get("/prc20-listings/active");
        const prc20Activity = await apiClient.get(
          `/prc20-listings/activity?tick=${prcId}`,
        );
        const prc20FloorPrice = await apiClient.get(
          `/informations/prc20-floorprice?tick=${prcId}`,
        );
        const prc20Transaction = await apiClient.get(
          `/prc20-listings/transaction?tick=${prcId}`,
        );
        const prc20Holders = await baseClient.get(
          `/belindex/holders?tick=${prcId}`,
        );
        return {
          prc20Token: prc20Token.data,
          prc20Info: prc20Info.data,
          prc20Active: prc20sActive.data.filter(
            (i: any) => i.prc20Label === params,
          ),
          prc20Activity: prc20Activity.data,
          prc20FloorPrice: prc20FloorPrice.data,
          prc20Transaction: prc20Transaction.data,
          prc20Holders: prc20Holders.data,
        };
      } catch (error) {
        console.error("Failed to fetch prc20", error);
        return {};
      }
    },
    staleTime: 1 * 60 * 1000,
  });

  // Fetch biggest-sales-of-day from offcahin database
  const {
    data: biggestSalesOfDay,
    isLoading: isBiggestSalesOfDayLoading,
    error: biggestSalesOfDayError,
  } = useQuery({
    queryKey: ["#biggestSalesOfDay"],
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

  // Fetch marketplace-stats from backend
  const {
    data: marketplaceStats,
    isLoading: isMarketplaceStatsLoading,
    error: marketplaceStatsError,
  } = useQuery({
    queryKey: ["#marketplaceStats"],
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

  return {
    pepemap,
    isPepemapLoading,
    pepemapError,

    collections,
    isCollectionsLoading,
    collectionsError,

    collection,
    isCollectionLoading,
    collectionError,

    prc20s,
    isPrc20sLoading,
    prc20sError,

    prc20,
    isPrc20Loading,
    prc20Error,

    biggestSalesOfDay,
    isBiggestSalesOfDayLoading,
    biggestSalesOfDayError,

    marketplaceStats,
    isMarketplaceStatsLoading,
    marketplaceStatsError,
  };
};
