"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { decryptWallet } from "@/lib/wallet/storage";

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
