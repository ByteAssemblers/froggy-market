"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Spinner } from "@/components/ui/spinner";
import { InscriptionAutoResume } from "@/components/InscriptionAutoResume";
import { Skeleton } from "@/components/ui/skeleton";

export default function InscribeHistory() {
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const { walletInfo, walletAddress, isLocked, hasSavedWallet, wallet } =
    useProfile();

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  useEffect(() => {
    walletInfo();
  }, []);

  const fetchInscriptions = async () => {
    setIsLoading(true);
    console.log("🔍 fetchInscriptions called:", {
      walletAddress,
      isLocked,
      wallet: wallet ? "exists" : "null",
    });

    // Only fetch inscriptions if wallet is unlocked
    if (!walletAddress || isLocked) {
      console.log("⛔ Cannot fetch: wallet locked or no address");
      setInscriptions([]);
      return;
    }

    console.log("🔄 Fetching inscription history for:", walletAddress);

    try {
      let page = 1;
      let allInscriptions: any = [];
      let continueFetching = true;

      while (continueFetching) {
        const url = `http://localhost:7777/inscriptions/balance/${walletAddress}/${page}`;
        console.log(`📡 Fetching page ${page}:`, url);

        const response = await fetch(url);

        if (!response.ok) {
          console.error(
            `❌ HTTP Error: ${response.status} ${response.statusText}`,
          );
          throw new Error(`Failed to fetch inscriptions: ${response.status}`);
        }

        const data = await response.json();
        console.log(`📦 Page ${page} response:`, data);

        if (data.inscriptions && data.inscriptions.length > 0) {
          // Add the new inscriptions to the list
          allInscriptions = [...allInscriptions, ...data.inscriptions];

          // Move to the next page
          page++;
        } else {
          // Stop if no more inscriptions are found
          continueFetching = false;
        }
      }

      // Sort inscriptions by timestamp in descending order
      allInscriptions.sort((a: any, b: any) => b.timestamp - a.timestamp);

      // Update the state with the sorted inscriptions
      setInscriptions(allInscriptions);
      console.log(`✅ Loaded ${allInscriptions.length} inscriptions`);
      setIsLoading(false);
    } catch (error) {
      console.error("❌ Failed to fetch inscriptions:", error);
      setInscriptions([]);
    }
  };

  // Fetch inscriptions when wallet unlocks or when wallet address changes
  // wallet object changes from null to data when unlocked, triggering refresh
  useEffect(() => {
    fetchInscriptions();
  }, [walletAddress, isLocked, wallet]);

  return (
    <>
      <div className="mt-6 mb-4 flex items-center justify-between">
        <h3 className="m-0 mx-0 my-[1em] block text-[1.17em] font-bold">
          History
        </h3>
        <div
          onClick={fetchInscriptions}
          className="inline-flex cursor-pointer items-center gap-2 transition-opacity"
        >
          {isLoading ? (
            <>
              <Spinner className="size-6" />
              <span>Loading</span>
            </>
          ) : (
            <>
              <RefreshCw />
              <span>Refresh</span>
            </>
          )}
        </div>
      </div>

      {/* Show message when wallet is locked */}
      {isLocked && hasSavedWallet && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-6 text-center">
          <div className="mb-2 text-lg">🔒 Wallet Locked</div>
          <div className="text-sm text-[#fffc]">
            Please unlock your wallet to view inscription history
          </div>
        </div>
      )}

      {/* Show message when no wallet */}
      {!hasSavedWallet && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-6 text-center">
          <div className="mb-2 text-lg">👛 No Wallet</div>
          <div className="text-sm text-[#fffc]">
            Please create or import a wallet to view inscription history
          </div>
        </div>
      )}

      <InscriptionAutoResume />

      {/* Show inscriptions only when wallet is unlocked */}
      {!isLocked && hasSavedWallet && (
        <div>
          {inscriptions.length === 0 ? (
            <Skeleton className="bg-transparent">
              <div className="mb-4 rounded-lg border border-white/20 bg-white/5 p-6 text-center"></div>
              <div className="mb-4 rounded-lg border border-white/20 bg-white/5 p-6 text-center"></div>
              <div className="mb-4 rounded-lg border border-white/20 bg-white/5 p-6 text-center"></div>
            </Skeleton>
          ) : (
            inscriptions.map((item, index) => {
              const isExpanded = expandedItems.has(index);

              return (
                <div key={index} className="mb-4">
                  <div className="flex items-center gap-4">
                    <div>{item.utxo.txid}</div>
                    <div className="mr-auto text-[0.9rem]">
                      {formatDistanceToNow(
                        new Date(item.timestamp * 1000).toLocaleString(),
                      )}
                    </div>
                    <div className="cursor-pointer text-[0.9rem] font-medium text-[#c891ff] [text-decoration:inherit]">
                      copy metadata
                    </div>
                    <div className="text-right text-green-500">
                      <div>inscribed</div>
                      <div>1/1</div>
                    </div>
                    <div
                      onClick={() => toggleExpanded(index)}
                      className="cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-2 flex gap-2 text-[0.9rem]">
                      <div>{item.content_type}</div>
                      <div>{item.content_length} bytes</div>
                      <div className="ml-auto flex">
                        <Link
                          href={`inscription/${item.inscription_id}`}
                          className="mr-4 cursor-pointer font-medium text-[#dfc0fd] [text-decoration:inherit]"
                        >
                          {item.inscription_id.slice(0, 3)}...
                          {item.inscription_id.slice(-3)}
                        </Link>
                        <span className="text-green-500">confirmed</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
