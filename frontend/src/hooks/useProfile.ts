"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { decryptWallet } from "@/lib/wallet/storage";
import { toast } from "sonner";

export const useProfile = () => {
  const queryClient = useQueryClient();
  const [wallet, setWallet] = useState<any>(null);
  const [mnemonic, setMnemonic] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [hasSavedWallet, setHasSavedWallet] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [walletState, setWalletState] = useState<
    "empty" | "password" | "import" | "secret" | "mywallet" | "send" | "lock"
  >("empty");

  // Fetch collections data
  const {
    data: collections,
    isLoading: isCollectionsLoading,
    error: collectionsError,
  } = useQuery({
    queryKey: ["collections"],
    queryFn: async (): Promise<any> => {
      try {
        const response = await fetch(`http://localhost:5555/api/collections`);
        const data = await response.json();
        return data;
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
        const response = await fetch(
          "https://pepeblocks.com/ext/getcurrentprice",
        );
        const data = await response.json();
        return data;
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
        const response = await fetch("/api/belindex/tokens?page_size=100");
        if (!response.ok) throw new Error("Failed to fetch tokens");
        const data = await response.json();
        return data.tokens;
      } catch (err) {
        console.error("Error fetching tokens:", err);
      }
    },
    staleTime: 10 * 60 * 1000,
  });

  // Wallet info mutataion
  const walletInfoMutation = useMutation({
    mutationFn: async (): Promise<any> => {
      const stored = localStorage.getItem("pepecoin_wallet");
      const backedUp = localStorage.getItem("pepecoin_wallet_backed_up");
      if (backedUp === "true") setHasBackedUp(true);

      if (stored) {
        const parsed = JSON.parse(stored);
        setHasSavedWallet(true);

        if (parsed.passwordProtected) {
          setIsLocked(true);
          setWalletState("lock");
        } else {
          decryptWallet(parsed, "")
            .then((w) => {
              setWallet(w);
              setWalletAddress(w.address);
              setMnemonic(w.mnemonic);
              setPrivateKey(w.privateKey);
              setWalletState("mywallet");
            })
            .catch(() => console.error("Auto-unlock failed"));
        }
      }

      return {
        wallet,
        mnemonic,
        privateKey,
        isLocked,
        hasSavedWallet,
        walletAddress,
        hasBackedUp,
        walletState,
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["wallet"], data);
      // toast.success("Wallet updated successfully");
    },
    onError: (error: any) => {
      const errorMessage =
        error?.response?.data?.message || "Failed to update profile";
      // toast.error(errorMessage);
    },
  });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ["collections"] });
    queryClient.invalidateQueries({ queryKey: ["pepecoinprice"] });
  };

  return {
    // Data
    collections,
    pepecoinPrice,
    tokens,

    // Loading states
    isCollectionsLoading,
    isPepecoinPriceLoading,
    isTokensLoading,

    // Errors
    collectionsError,
    pepecoinPriceError,
    tokensError,

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
