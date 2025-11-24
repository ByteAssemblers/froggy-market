"use client";

import { useEffect } from "react";
import Pepemaps from "@/components/page/Pepemaps";
import Collections from "@/components/page/Collections";
import PRCTwenty from "@/components/page/PRCTwenty";
import BiggestSalesOfDay from "@/components/page/BiggestSalesOfDay";
import { useProfile } from "@/hooks/useProfile";

export default function Home() {
  const {
    walletInfo,
    wallet,
    mnemonic,
    privateKey,
    isLocked,
    hasSavedWallet,
    walletAddress,
    hasBackedUp,
    walletState,
    isWalletInfo,
  } = useProfile();

  useEffect(() => {
    walletInfo();
  }, []);

  return (
    <>
      <Pepemaps />
      <Collections />
      <PRCTwenty />
      <BiggestSalesOfDay />
    </>
  );
}
