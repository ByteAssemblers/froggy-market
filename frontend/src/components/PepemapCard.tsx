"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/axios";
import { completeBuyPSBT } from "@/lib/marketplace/psbt";
import { useProfile } from "@/hooks/useProfile";
import { getPepecoinBalance } from "@/lib/wallet/getBalance";

interface PepemapCardProps {
  item: {
    id?: string;
    blockNumber: number;
    pepemapLabel: string;
    priceSats: number;
    sellerAddress?: string;
    inscriptionId: string;
  };
  pepecoinPrice: number;
}

const PepemapCard: React.FC<PepemapCardProps> = ({ item, pepecoinPrice }) => {
  const [imgError, setImgError] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [isBuying, setIsBuying] = useState(false);

  const { walletAddress, privateKey, wallet } = useProfile();

  const imgUrl = `/api/pepemaps/${item.blockNumber}.png`;
  const priceInPepe = item.priceSats; // priceSats is already in PEPE units
  const totalCost = item.priceSats * 1.028 + 0.5; // price + 2.8% fee + 0.5 PEPE network fee

  // Fetch balance when wallet changes
  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress) return;
      setLoadingBalance(true);
      try {
        const bal = await getPepecoinBalance(walletAddress);
        setBalance(bal);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchBalance();
  }, [wallet, walletAddress]);

  const handlePepemapBuy = async () => {
    if (!walletAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (!privateKey) {
      alert("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setIsBuying(true);

      // Step 1: Get the listing with PSBT from backend
      const listingResponse = await apiClient.get(
        `/pepemap-listings/inscription/${item.inscriptionId}`,
      );

      if (!listingResponse.data.listing?.psbtBase64) {
        throw new Error("Listing PSBT not found");
      }

      const psbtBase64 = listingResponse.data.listing.psbtBase64;

      // Step 2: Complete the PSBT with buyer's payment and broadcast
      const txid = await completeBuyPSBT(
        psbtBase64,
        privateKey,
        walletAddress,
        item.priceSats,
      );

      // Step 3: Update backend with the sale
      await apiClient.post("/pepemap-listings/buy", {
        inscriptionId: item.inscriptionId,
        buyerAddress: walletAddress,
        priceSats: item.priceSats,
        txid: txid,
      });

      alert(`Pepemap purchased successfully! Transaction: ${txid}`);
      // Refresh to show updated status
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(
        `Failed to buy pepemap: ${error.response?.data?.message || error.message}`,
      );
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <Card
      key={item.inscriptionId}
      className="relative flex flex-col gap-0 overflow-hidden rounded-[12px] bg-[#4c505c33] p-0 outline-1 outline-transparent transition-all duration-200 ease-in-out hover:border-[#8c45ff] hover:[&_div]:[&_button]:bg-[#8c45ff] hover:[&_div]:[&_button]:text-white"
    >
      {!imgError && (
        <div className="flex px-3 pt-3 pb-0">
          <Image
            src={imgUrl}
            alt={`Pepemap ${item.pepemapLabel}`}
            width={112}
            height={112}
            className="mx-auto h-28 max-w-full object-contain"
            onError={() => setImgError(true)}
            unoptimized
          />
        </div>
      )}

      <div className="flex h-full flex-col px-3 pt-1 pb-3">
        {imgError ? (
          <div className="mt-11 mb-11 text-center text-[1.1rem]">
            {item.pepemapLabel}
          </div>
        ) : (
          <div className="my-1 text-center text-[1.1rem]">
            {item.pepemapLabel}
          </div>
        )}
        <div className="text-[0.8rem] text-[#fffc]">
          <div className="flex justify-between">
            <div>Seller:</div>
            <Link
              href={`/wallet/${item.sellerAddress || ''}`}
              className="cursor-pointer font-medium text-[#c891ff] no-underline"
            >
              {item.sellerAddress ? `${item.sellerAddress.slice(0, 5)}...${item.sellerAddress.slice(-5)}` : 'Unknown'}
            </Link>
          </div>
        </div>
        <div className="mt-1.5 border-t border-white/10 py-2">
          <div>
            <div className="flex justify-center text-center">
              <Image
                src="/assets/coin.gif"
                alt="coin"
                width={18}
                height={18}
                priority
                className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
              />
              {priceInPepe}&#xA0;
              <span className="text-[0.9rem] text-[#fffc]">
                (${(priceInPepe * pepecoinPrice).toFixed(2)})
              </span>
            </div>
          </div>
        </div>
        <Dialog>
          <DialogTrigger className="font-inherit w-full cursor-pointer rounded-[12px] border-0 bg-[#e6d8fe] px-4 py-2 text-[1em] font-extrabold text-[#9c63fa] transition-all duration-250 ease-in-out">
            Buy
          </DialogTrigger>
          <DialogContent className="my-[50px] box-border flex min-h-[500px] w-xl max-w-[calc(100%-1rem)] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
            <DialogHeader>
              <DialogTitle className="mt-0 mb-2 text-center text-3xl leading-[1.1] font-semibold text-[#e6d8fe]">
                Buy pepemaps
              </DialogTitle>
              <DialogDescription></DialogDescription>
              <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
                <div className="rounded-[12px] bg-[#00000080] p-2">
                  <div className="flex">
                    <Image
                      src={imgUrl}
                      alt={`Pepemap ${item.pepemapLabel}`}
                      width={144}
                      height={144}
                      className="mx-auto h-36 w-36 rounded-md text-[0.8rem]"
                      unoptimized
                    />
                  </div>
                  <div className="mt-2 text-center text-[1rem] text-white">
                    {item.pepemapLabel}
                  </div>
                </div>
              </div>
              <div className="mt-auto grid grid-cols-[1fr_auto_auto] leading-[1.6]">
                <div className="text-[0.95rem] text-white">
                  Taker fee (2.8%)
                </div>
                <div className="flex text-[1rem] text-white">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mt-[0.1rem] mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  {((priceInPepe * 2.8) / 100).toFixed(2)}
                </div>
                <span className="ml-4 text-right text-[0.9rem] text-[#fffc]">
                  $ {(priceInPepe * 0.028 * pepecoinPrice).toFixed(2)}
                </span>
                <div className="text-[0.95rem] text-white">Network fee</div>
                <div className="flex text-[1rem] text-white">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mt-[0.1rem] mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  ≈0.5
                </div>
                <span className="ml-4 text-right text-[0.9rem] text-[#fffc]">
                  $0.099
                </span>
                <div className="mt-5 text-[1rem] font-bold text-white">
                  Total
                </div>
                <div className="mt-5 flex text-[1rem] font-bold text-white">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mt-[0.1rem] mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  {(priceInPepe * 1.028 + 0.5).toFixed(2)}
                </div>
                <span className="mt-5 ml-4 text-right text-[0.9rem] font-bold text-[#fffc]">
                  ${((priceInPepe * 1.028 + 0.5) * pepecoinPrice).toFixed(2)}
                </span>
                <div className="mt-2 text-[0.95rem] text-white">
                  Available balance
                </div>
                <div className="mt-2 flex text-[1rem] text-white">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mt-[0.1rem] mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  {loadingBalance ? "..." : (balance || 0).toFixed(2)}
                </div>
                <span className="mt-2 ml-4 text-right text-[0.9rem] text-[#fffc]">
                  ${loadingBalance ? "..." : ((balance || 0) * pepecoinPrice).toFixed(2)}
                </span>
              </div>
              <button
                onClick={handlePepemapBuy}
                disabled={!balance || balance < totalCost || isBuying}
                className="font-inherit mt-4 flex w-full justify-center rounded-[12px] border border-transparent px-4 py-2 text-[1em] font-bold text-white transition-all duration-200 ease-in-out disabled:bg-[#1a1a1a] enabled:bg-[#007aff] enabled:hover:bg-[#0056b3]"
              >
                {isBuying
                  ? "Processing..."
                  : !balance || balance < totalCost
                    ? "Insufficient balance"
                    : "Confirm purchase"}
              </button>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};

export default PepemapCard;
