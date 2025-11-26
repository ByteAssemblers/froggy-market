"use client";
import { use, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { blockchainClient, apiClient, baseClient } from "@/lib/axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendInscriptionTransaction } from "@/lib/wallet/sendInscription";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EllipsisVertical, Filter } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { createListingPSBT, findInscriptionUTXO } from "@/lib/marketplace/psbt";
import {
  getPepemapBlockNumber,
  fetchPepemapImage,
  PEPEMAP_GREEN_PLACEHOLDER,
} from "@/lib/pepemapImage";
import Avatar from "@/components/Avatar";
import {
  saveJob,
  saveFileData,
  getAllJobs,
  type InscriptionJob,
} from "@/lib/inscription/indexedDB";
import { toast } from "sonner";
import { resolveFileContentType } from "@/lib/inscription/inscribe";
import { processJob } from "@/lib/inscription/inscriptionWorker";
import { PEPE_PER_KB_FEE, RECOMMENDED_FEE } from "@/constants/inscription";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice } from "@/components/page/PRCTwenty";
import { useSearchParams, useRouter } from "next/navigation";
import { IconTag, IconTagOff, IconSend, IconSend2 } from "@tabler/icons-react";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

// PepemapImage component
export function PepemapImage({ item, sm }: { item: any; sm?: boolean }) {
  const [imageSrc, setImageSrc] = useState(PEPEMAP_GREEN_PLACEHOLDER);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const blockNumber = getPepemapBlockNumber(item);
    if (blockNumber != null) {
      setIsLoading(true);
      fetchPepemapImage(blockNumber)
        .then((url) => {
          setImageSrc(url);
          setIsLoading(false);
        })
        .catch(() => {
          setImageSrc("/assets/imagenotfound.png");
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [item]);

  return (
    <img
      src={imageSrc}
      alt="pepemap"
      width={sm ? 48 : 128}
      height={sm ? 48 : 128}
      className={`pointer-events-none rounded-xl object-contain text-[0.8rem] select-none ${
        isLoading ? "opacity-50" : ""
      }`}
    />
  );
}

export default function WalletAddress({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const tab = searchParams.get("tab") ?? "prc";
  const handleChange = (value: string) => {
    router.push(`?tab=${value}`);
  };
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [pepemaps, setPepemaps] = useState<any[]>([]);
  const [ticks, setTicks] = useState<any[]>([]);
  const [listingStatuses, setListingStatuses] = useState<Map<string, any>>(
    new Map(),
  );
  const [pepemapListingStatuses, setPepemapListingStatuses] = useState<
    Map<string, any>
  >(new Map());
  const [isLoadingInscriptions, setIsLoadingInscriptions] = useState(false);
  const [history, setHistory] = useState<[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activity, setActivity] = useState<[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const {
    wallet,
    walletInfo,
    walletAddress,
    privateKey,
    pepecoinPrice,
    collections,
    isCollectionsLoading,
    collectionsError,
  } = useProfile();

  useEffect(() => {
    walletInfo();
  }, []);

  // Get all inscription IDs from collections
  const inscriptionIdsInCollections =
    collections?.flatMap((collection: any) =>
      collection.inscriptions.map((ins: any) => ins.inscriptionId),
    ) || [];

  useEffect(() => {
    const fetchWalletNft = async () => {
      setIsLoadingInscriptions(true);
      try {
        let page = 1;
        let allInscriptions: any = [];
        let continueFetching = true;

        while (continueFetching) {
          const response = await blockchainClient.get(
            `/inscriptions/balance/${address}/${page}`,
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

        // Fetch listing status for each inscription
        const statusMap = new Map();
        const pepemapStatusMap = new Map();

        for (const inscription of allInscriptions) {
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
              pepemapStatusMap.set(
                inscription.inscription_id,
                statusResponse.data,
              );
            } catch (err) {
              pepemapStatusMap.set(inscription.inscription_id, {
                status: null,
                listing: null,
              });
            }
          } else {
            // Fetch regular NFT listing status
            try {
              const statusResponse = await apiClient.get(
                `/listings/inscription/${inscription.inscription_id}`,
              );
              statusMap.set(inscription.inscription_id, statusResponse.data);
            } catch (err) {
              statusMap.set(inscription.inscription_id, {
                status: null,
                listing: null,
              });
            }
          }
        }

        setListingStatuses(statusMap);
        setPepemapListingStatuses(pepemapStatusMap);
      } catch (error) {
        console.error("Error fetching inscriptions:", error);
      } finally {
        setIsLoadingInscriptions(false);
      }
    };

    if (address) {
      fetchWalletNft();
    }
  }, [address]);

  useEffect(() => {
    const fetchWalletPrc = async () => {
      try {
        const response = await fetch(`/api/belindex/address/${address}`);
        const data = await response.json();
        setTicks(data);
      } catch (error) {
        console.error("Error fetching prc-20:", error);
      }
    };

    if (address) {
      fetchWalletPrc();
    }
  }, [address]);

  useEffect(() => {
    const fetchWalletPepemap = async () => {
      try {
        const response = await blockchainClient.get(
          `pepemap/address/${address}`,
        );
        const data = response.data;
        setPepemaps(data);
      } catch (error) {
        console.error("Error fetching pepemap:", error);
      }
    };

    if (address) {
      fetchWalletPepemap();
    }
  }, [address]);

  useEffect(() => {
    const fetchWalletPrcHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const response = await apiClient.get(
          `/informations/wallet-history?address=${address}`,
        );
        setHistory(response.data);
      } catch (error) {
        console.error("Error fetching prc-20 history", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (address) {
      fetchWalletPrcHistory();
    }
  }, [address]);

  useEffect(() => {
    const fetchWalletPrcActivity = async () => {
      try {
        setIsLoadingActivity(true);
        const response = await apiClient.get(
          `/informations/wallet-activity?address=${address}`,
        );
        setActivity(response.data);
      } catch (error) {
        console.error("Error fetching prc-20 activity", error);
      } finally {
        setIsLoadingActivity(false);
      }
    };

    if (address) {
      fetchWalletPrcActivity();
    }
  }, [address]);

  // Get all inscription IDs from pepemaps
  const inscriptionIdsInPepemaps =
    pepemaps?.map((pepemap: any) => pepemap.inscription_id) || [];

  const handleUnlist = async (item: any) => {
    try {
      await apiClient.post("/listings/unlist", {
        inscriptionId: item.inscription_id,
        sellerAddress: walletAddress,
      });

      toast.success("NFT unlisted successfully!");
      // Refresh the wallet data using React Query
      await queryClient.invalidateQueries({
        queryKey: ["myWalletNft", walletAddress],
        refetchType: "active",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(
        `Failed to unlist: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  const handlePepemapUnlist = async (item: any) => {
    try {
      await apiClient.post("/pepemap-listings/unlist", {
        inscriptionId: item.inscription_id,
        sellerAddress: walletAddress,
      });

      toast.success("Pepemap unlisted successfully!");
      // Refresh the wallet data using React Query
      await queryClient.invalidateQueries({
        queryKey: ["myWalletNft", walletAddress],
        refetchType: "active",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(
        `Failed to unlist: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  function ListDialogContent({ item }: { item: any }) {
    const [price, setPrice] = useState<Number>(0);
    const [loading, setLoading] = useState(false);

    async function handleList() {
      if (Number(price) <= 0) {
        toast.error("Please enter a valid price");
        return;
      }

      if (!privateKey) {
        toast.error("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setLoading(true);

        // Step 1: Find the UTXO containing the inscription
        const inscriptionUtxo = await findInscriptionUTXO(
          walletAddress,
          item.inscription_id,
        );

        // Step 2: Create PSBT for the listing
        const psbtBase64 = await createListingPSBT(
          inscriptionUtxo,
          Number(price),
          privateKey,
          walletAddress,
        );

        // Step 3: Save listing to database with PSBT
        await apiClient.post("/listings/list", {
          inscriptionId: item.inscription_id,
          priceSats: Number(price),
          sellerAddress: walletAddress,
          psbtBase64: psbtBase64,
        });

        toast.success("NFT listed successfully!");
        setLoading(false);
        // Refresh the wallet data using React Query
        await queryClient.invalidateQueries({
          queryKey: ["myWalletNft", walletAddress],
          refetchType: "active",
        });
      } catch (error: any) {
        setLoading(false);
        console.error(error);
        toast.error(
          `Failed to list NFT: ${error.response?.data?.message || error.message}`,
        );
      }
    }
    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <Image
              src={`${ORD_API_BASE}/content/${item.inscription_id}`}
              alt={`Inscription #${item.inscription_id}`}
              width={144}
              height={144}
              className="mx-auto h-36 w-36 rounded-md text-[0.8rem]"
              unoptimized
            />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                #{item.inscription_number}
              </div>
            </div>
          </div>
        </div>
        <div className="my-4 flex w-full items-center justify-center">
          <div className="mr-8 ml-14 pt-4 font-semibold">Price:</div>
          <Image
            src="/assets/coin.gif"
            alt="coin"
            width={18}
            height={18}
            priority
            className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
          />
          <input
            type="number"
            value={Number(price)}
            onChange={(e) => setPrice(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "." || e.key === "e" || e.key === "-") {
                e.preventDefault();
              }
            }}
            className="font-inherit mr-2 w-20 max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
          />
        </div>
        <div className="mt-2 flex justify-center leading-8">
          <div className="mr-8 w-1/2 text-right">Maker fee (1.4%):</div>
          <div className="flex w-1/2 text-left">
            {price !== 0 && (
              <>
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />
                <span>{(Number(price) * 0.014).toFixed(2)}</span>
                <span className="text-[#fffc]">
                  ($
                  {(Number(price) * 0.014 * pepecoinPrice).toFixed(2)})
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-center leading-8">
          <div className="mr-8 w-1/2 text-right">You will receive:</div>
          <div className="flex w-1/2 text-left">
            {price !== 0 && (
              <>
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />

                <span>{(Number(price) * 0.986).toFixed(2)}</span>
                <span className="text-[#fffc]">
                  ($
                  {(Number(price) * 0.986 * pepecoinPrice).toFixed(2)})
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleList}
          disabled={loading || Number(price) <= 0}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            loading || Number(price) <= 0
              ? "bg-[#1a1a1a]"
              : "bg-[#007aff] hover:bg-[#3b82f6]"
          }`}
        >
          {loading ? "Listing..." : "Confirm Listing"}
        </button>
      </>
    );
  }

  function SendDialogContent({ item }: { item: any }) {
    const [toAddress, setToAddress] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const validateAddress = (address: string) =>
      /^[P][a-zA-Z0-9]{25,34}$/.test(address);

    useEffect(() => {
      setIsValid(validateAddress(toAddress));
    }, [toAddress]);

    async function handleSend() {
      if (!isValid || !toAddress) {
        setMessage("Please enter a valid Pepecoin address");
        return;
      }

      if (!privateKey) {
        setMessage("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setIsLoading(true);
        setMessage("Finding inscription UTXO...");

        // Step 1: Find the UTXO containing the inscription
        const inscriptionUtxo = await findInscriptionUTXO(
          walletAddress,
          item.inscription_id,
        );

        console.log("Found inscription UTXO:", inscriptionUtxo);

        setMessage("Creating transaction...");

        // Step 2: Send the inscription
        const txid = await sendInscriptionTransaction(
          inscriptionUtxo,
          privateKey,
          walletAddress,
          toAddress,
        );

        console.log("Transaction broadcast:", txid);

        setMessage("Recording transaction...");

        // Step 3: Record the send in the database
        await apiClient.post("/listings/send", {
          inscriptionId: item.inscription_id,
          fromAddress: walletAddress,
          toAddress: toAddress,
          txid: txid,
        });

        setMessage(
          `✅ NFT sent successfully!\n\nTransaction ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
        );

        // Wait 2 seconds then reload
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error: any) {
        console.error("Send error:", error);
        setMessage(`❌ Failed to send: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <Image
              src={`${ORD_API_BASE}/content/${item.inscription_id}`}
              alt={`Inscription #${item.inscription_id}`}
              width={144}
              height={144}
              className="mx-auto h-36 w-36 rounded-md text-[0.8rem]"
              unoptimized
            />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                #{item.inscription_number}
              </div>
            </div>
          </div>
        </div>
        <div className="my-4 flex w-full items-center justify-center">
          <div className="mr-4 text-[1.1rem] font-semibold">Send to:</div>
          <input
            className="font-inherit mr-2 w-full max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value.trim())}
          />
        </div>

        <div className="mt-12 flex justify-center text-[0.9rem] leading-8">
          <div className="mr-8 w-1/2 text-right">Network fee:</div>
          <div className="flex w-1/2 text-left">
            <Image
              src="/assets/coin.gif"
              alt="coin"
              width={18}
              height={18}
              priority
              className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
            />
            <span>~0.016</span>
            <span className="text-[#fffc]"> ($0.00)</span>
          </div>
        </div>

        <button
          disabled={!isValid || isLoading}
          onClick={handleSend}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            !isValid ? "bg-[#1a1a1a]" : "bg-[#007aff]"
          }`}
        >
          {isLoading
            ? "Creating transfer"
            : isValid
              ? "Confirm"
              : "Enter valid address"}
        </button>

        {message && (
          <div className="mt-3 text-center text-sm break-all text-[#dfc0fd]">
            {message}
          </div>
        )}
      </>
    );
  }

  function PepemapListDialogContent({ item }: { item: any }) {
    const [price, setPrice] = useState<Number>(0);
    const [loading, setLoading] = useState(false);

    async function handlePepemapList() {
      if (Number(price) <= 0) {
        toast.error("Please enter a valid price");
        return;
      }

      if (!privateKey) {
        toast.error("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setLoading(true);

        // Step 1: Find the UTXO containing the inscription
        const inscriptionUtxo = await findInscriptionUTXO(
          walletAddress,
          item.inscription_id,
        );

        // Step 2: Create PSBT for the listing
        const psbtBase64 = await createListingPSBT(
          inscriptionUtxo,
          Number(price),
          privateKey,
          walletAddress,
        );

        // Step 3: Save pepemap listing to database with PSBT
        await apiClient.post("/pepemap-listings/list", {
          inscriptionId: item.inscription_id,
          pepemapLabel: item.content,
          priceSats: Number(price),
          sellerAddress: walletAddress,
          psbtBase64: psbtBase64,
        });

        toast.success("Pepemap listed successfully!");
        setLoading(false);
        // Refresh the wallet data using React Query
        await queryClient.invalidateQueries({
          queryKey: ["myWalletNft", walletAddress],
          refetchType: "active",
        });
      } catch (error: any) {
        setLoading(false);
        console.error(error);
        toast.error(
          `Failed to list pepemap: ${error.response?.data?.message || error.message}`,
        );
      }
    }

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <PepemapImage item={item} />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                {item.content}
              </div>
            </div>
          </div>
        </div>
        <div className="my-4 flex w-full items-center justify-center">
          <div className="mr-8 ml-14 pt-4 font-semibold">Price:</div>
          <Image
            src="/assets/coin.gif"
            alt="coin"
            width={18}
            height={18}
            priority
            className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
          />
          <input
            type="number"
            value={Number(price)}
            onChange={(e) => setPrice(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "." || e.key === "e" || e.key === "-") {
                e.preventDefault();
              }
            }}
            className="font-inherit mr-2 w-20 max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
          />
        </div>
        <div className="mt-2 flex justify-center leading-8">
          <div className="mr-8 w-1/2 text-right">Maker fee (1.4%):</div>
          <div className="flex w-1/2 text-left">
            {price !== 0 && (
              <>
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />
                <span>{(Number(price) * 0.014).toFixed(2)}</span>
                <span className="text-[#fffc]">
                  ($
                  {(Number(price) * 0.014 * pepecoinPrice).toFixed(2)})
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-center leading-8">
          <div className="mr-8 w-1/2 text-right">You will receive:</div>
          <div className="flex w-1/2 text-left">
            {price !== 0 && (
              <>
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />

                <span>{(Number(price) * 0.986).toFixed(2)}</span>
                <span className="text-[#fffc]">
                  ($
                  {(Number(price) * 0.986 * pepecoinPrice).toFixed(2)})
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handlePepemapList}
          disabled={loading || Number(price) <= 0}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            loading || Number(price) <= 0
              ? "bg-[#1a1a1a]"
              : "bg-[#007aff] hover:bg-[#3b82f6]"
          }`}
        >
          {loading ? "Listing..." : "Confirm Listing"}
        </button>
      </>
    );
  }

  function PepemapSendDialogContent({ item }: { item: any }) {
    const [toAddress, setToAddress] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const validateAddress = (address: string) =>
      /^[P][a-zA-Z0-9]{25,34}$/.test(address);

    useEffect(() => {
      setIsValid(validateAddress(toAddress));
    }, [toAddress]);

    async function handlePepemapSend() {
      if (!isValid || !toAddress) {
        setMessage("Please enter a valid Pepecoin address");
        return;
      }

      if (!privateKey) {
        setMessage("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setIsLoading(true);
        setMessage("Finding inscription UTXO...");

        // Step 1: Find the UTXO containing the inscription
        const inscriptionUtxo = await findInscriptionUTXO(
          walletAddress,
          item.inscription_id,
        );

        console.log("Found inscription UTXO:", inscriptionUtxo);

        setMessage("Creating transaction...");

        // Step 2: Send the inscription
        const txid = await sendInscriptionTransaction(
          inscriptionUtxo,
          privateKey,
          walletAddress,
          toAddress,
        );

        console.log("Transaction broadcast:", txid);

        setMessage("Recording transaction...");

        // Step 3: Record the send in the database
        await apiClient.post("/pepemap-listings/send", {
          inscriptionId: item.inscription_id,
          pepemapLabel: item.content,
          fromAddress: walletAddress,
          toAddress: toAddress,
          txid: txid,
        });

        setMessage(
          `✅ Pepemap sent successfully!\n\nTransaction ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
        );

        // Wait 2 seconds then reload
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error: any) {
        console.error("Send error:", error);
        setMessage(`❌ Failed to send: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <PepemapImage item={item} />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                {item.content}
              </div>
            </div>
          </div>
        </div>
        <div className="my-4 flex w-full items-center justify-center">
          <div className="mr-4 text-[1.1rem] font-semibold">Send to:</div>
          <input
            className="font-inherit mr-2 w-full max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value.trim())}
          />
        </div>

        <div className="mt-12 flex justify-center text-[0.9rem] leading-8">
          <div className="mr-8 w-1/2 text-right">Network fee:</div>
          <div className="flex w-1/2 text-left">
            <Image
              src="/assets/coin.gif"
              alt="coin"
              width={18}
              height={18}
              priority
              className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
            />
            <span>~0.016</span>
            <span className="text-[#fffc]"> ($0.00)</span>
          </div>
        </div>

        <button
          disabled={!isValid || isLoading}
          onClick={handlePepemapSend}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            !isValid ? "bg-[#1a1a1a]" : "bg-[#007aff]"
          }`}
        >
          {isLoading
            ? "Creating transfer"
            : isValid
              ? "Confirm"
              : "Enter valid address"}
        </button>

        {message && (
          <div className="mt-3 text-center text-sm break-all text-[#dfc0fd]">
            {message}
          </div>
        )}
      </>
    );
  }

  function PrcInscribeDialogContent({ item }: { item: any }) {
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [amount, setAmount] = useState("");
    const [isInscribing, setIsInscribing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [pepePer, setPepePer] = useState<number>(PEPE_PER_KB_FEE);
    const [pepePerState, setPepePerState] = useState<"recommended" | "custom">(
      "recommended",
    );

    useEffect(() => {
      if (
        Number(item.balance) >= Number(amount) &&
        amount != "" &&
        Number(amount) != 0
      ) {
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    }, [amount]);

    const fetchInscriptions = async () => {
      setIsLoading(true);

      console.log("🔄 Fetching inscription history for:", walletAddress);

      try {
        // 1. Get active jobs from IndexedDB
        const activeJobs = await getAllJobs();
        const myActiveJobs = activeJobs.filter(
          (job) => job.status === "processing" || job.status === "pending",
        );

        // 2. Fetch completed inscriptions from API
        let page = 1;
        let allInscriptions: any = [];
        let continueFetching = true;

        while (continueFetching) {
          const url = `/inscriptions/balance/${walletAddress}/${page}`;
          console.log(`📡 Fetching page ${page}:`, ORD_API_BASE + url);

          try {
            const response = await blockchainClient.get(url);
            const data = response.data;
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
          } catch (error: any) {
            console.error(`❌ HTTP Error:`, error.message);
            throw new Error(`Failed to fetch inscriptions: ${error.message}`);
          }
        }

        // 3. Merge active jobs with completed inscriptions
        const mergedList = [
          ...myActiveJobs.map((job) => ({
            ...job,
            isActiveJob: true, // Flag to identify active jobs
          })),
          ...allInscriptions,
        ];

        // Sort by timestamp/createdAt in descending order
        mergedList.sort((a: any, b: any) => {
          const aTime = a.timestamp || a.createdAt / 1000;
          const bTime = b.timestamp || b.createdAt / 1000;
          return bTime - aTime;
        });

        // Update the state with the merged list
        setInscriptions(mergedList);
        console.log(
          `✅ Loaded ${allInscriptions.length} completed + ${myActiveJobs.length} active inscriptions`,
        );
        setIsLoading(false);
      } catch (error) {
        console.error("❌ Failed to fetch inscriptions:", error);
        setInscriptions([]);
        setIsLoading(false);
      }
    };

    const computeFeeRate = () => {
      const recommended = Math.max(
        1,
        Math.floor((RECOMMENDED_FEE * 1e8) / 1_000),
      );
      if (pepePerState !== "custom") return recommended;
      const custom = Number.parseFloat(String(pepePer));
      if (!Number.isFinite(custom) || custom <= 0) return recommended;
      return Math.max(1, Math.floor((custom * 1e8) / 1_000));
    };

    const handleInscribe = async () => {
      const activeJobs = await getAllJobs();
      const hasActiveJob = activeJobs.some(
        (job) => job.status === "processing" || job.status === "pending",
      );

      const transfer = `{"p": "prc-20", "op": "transfer", "tick": "${item.tick}", "amt": "${amount}"}`;

      if (hasActiveJob) {
        toast.error("Please wait for the current inscription to complete.");
        return;
      }

      try {
        setIsInscribing(true);

        let file: {
          name: string;
          size: number;
          type: string;
          arrayBuffer: () => Promise<ArrayBuffer>;
        };

        const blob = new Blob([transfer], { type: "application/json" });

        file = {
          name: "transfer.json",
          size: blob.size,
          type: "application/json",
          arrayBuffer: () => blob.arrayBuffer(),
        };

        setStatusMessage("Preparing text and adding to queue…");

        let payload: Uint8Array;
        try {
          const buffer = await file.arrayBuffer();
          payload = new Uint8Array(buffer);
        } catch (_readErr) {
          throw new Error(
            "Failed to read the selected file. Please try again.",
          );
        }

        const contentType = resolveFileContentType(file);
        const feeRate = computeFeeRate();

        // Create job in IndexedDB
        const job: InscriptionJob = {
          id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
          fileName: file.name,
          fileSize: file.size,
          contentType,
          status: "processing",
          progress: 0,
          currentCommit: 0,
          totalCommits: 0,
          createdAt: Date.now(),
        };

        // Save job and file data to IndexedDB
        await saveJob(job);
        await saveFileData(job.id, payload);

        console.log(`📝 Job saved to IndexedDB: ${file.name} (ID: ${job.id})`);
        toast.success(`${file.name} started inscribing!`);

        // Trigger history refresh to show the new job immediately
        fetchInscriptions();
        // Process the job and AWAIT completion
        const result = await processJob(
          job.id,
          wallet,
          feeRate,
          (update: Partial<InscriptionJob>) => {
            console.log("📊 Progress update:", update);
            // Update UI with progress
            if (update.currentCommit && update.totalCommits) {
              setStatusMessage(
                `Processing commit ${update.currentCommit}/${update.totalCommits}...`,
              );
            }
            // Refresh history to show progress updates
            fetchInscriptions();
          },
        );

        setStatusMessage("Inscription complete.");
        toast.success(`${file.name} inscribed successfully!`);
        console.log(`✅ Inscription complete for ${file.name}`);

        // Call backend API to record the transfer inscription with status='transfer'
        try {
          const inscriptionId = result.revealTxid + "i0";
          await apiClient.post("/prc20-listings/inscribe", {
            inscriptionId: inscriptionId,
            prc20Label: item.tick,
            amount: Number(amount),
            sellerAddress: walletAddress,
            txid: result.revealTxid,
          });
          console.log(
            `✅ PRC-20 transfer registered in backend: ${inscriptionId}`,
          );
        } catch (error: any) {
          console.error(
            "❌ Failed to register PRC-20 transfer in backend:",
            error,
          );
          // Don't fail the whole operation if backend recording fails
          toast.error("Warning: Failed to record transfer in marketplace");
        }

        fetchInscriptions();
      } catch (error: any) {
        console.error("❌ Inscription failed:", error);
        setStatusMessage("");
        toast.error(error?.message || "Failed to inscribe. Please try again.");
        fetchInscriptions();
      } finally {
        setIsInscribing(false);
      }
      setAmount("");
    };

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <Avatar text={item.tick} xl />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                {item.tick}
              </div>
            </div>
          </div>
        </div>

        <div className="my-4 flex w-full items-center justify-center">
          <div className="mt-8 mr-4 text-[1.1rem] font-semibold">
            <span>Inscribe amount:</span>
            <div className="text-[13px]">(Available {item.balance})</div>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "." || e.key === "e" || e.key === "-") {
                e.preventDefault();
              }
            }}
            className="font-inherit mr-16 w-20 max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
          />
        </div>

        <div className="mt-12 flex justify-center text-[0.9rem] leading-8">
          <div className="mr-8 w-1/2 text-right">Network fee:</div>
          <div className="flex w-1/2 text-left">
            <Image
              src="/assets/coin.gif"
              alt="coin"
              width={18}
              height={18}
              priority
              className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
            />
            <span>~0.037</span>
            <span className="text-[#fffc]"> ($0.00)</span>
          </div>
        </div>

        <button
          disabled={!isValid || isLoading}
          onClick={handleInscribe}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            !isValid ? "bg-[#1a1a1a]" : "bg-[#007aff]"
          }`}
        >
          {isLoading
            ? "Inscribing"
            : isValid
              ? "Confirm"
              : "Enter valid amount"}
        </button>

        {statusMessage && (
          <div className="mt-3 text-center text-sm break-all text-[#dfc0fd]">
            {statusMessage}
          </div>
        )}
      </>
    );
  }

  function PrcTransfersDialogContent({ item }: { item: any }) {
    const [prcBalance, setPrcBalance] = useState<any[]>([]);
    const [listingStatuses, setListingStatuses] = useState<
      Map<string, boolean>
    >(new Map());
    const [loading, setLoading] = useState(true);

    const fetchPrcBalance = async () => {
      try {
        setLoading(true);
        const response = await baseClient.get(
          `belindex/address/${walletAddress}/${item.tick}/balance`,
        );
        const data = response.data;
        const allTransfers = data.transfers || [];

        // Check listing status for each transfer and store it
        const statusMap = new Map<string, boolean>();
        for (const transfer of allTransfers) {
          const inscriptionId = transfer.outpoint.split(":")[0] + "i0";
          try {
            const statusResponse = await apiClient.get(
              `/prc20-listings/inscription/${inscriptionId}`,
            );
            const status = statusResponse.data;
            statusMap.set(inscriptionId, status.status === "listed");
          } catch (error) {
            // If error (not found in DB), it's not listed
            statusMap.set(inscriptionId, false);
          }
        }

        setListingStatuses(statusMap);
        setPrcBalance(allTransfers);
      } catch (error: any) {
        console.error(`Failed to fetch Prc-20 balance: ${error.message}`);
        setPrcBalance([]);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchPrcBalance();
    }, []);

    function TransferRow({ transfer }: { transfer: any }) {
      const inscriptionId = transfer.outpoint.split(":")[0] + "i0";
      const isListed = listingStatuses.get(inscriptionId) || false;

      const handleUnlistTransfer = async () => {
        try {
          await apiClient.post("/prc20-listings/unlist", {
            inscriptionId,
            sellerAddress: walletAddress,
          });

          toast.success("Transfer unlisted successfully!");
          // Refresh the wallet data using React Query
          await queryClient.invalidateQueries({
            queryKey: ["myWalletPrc20", walletAddress],
            refetchType: "active",
          });
        } catch (error: any) {
          console.error(error);
          toast.error(
            `Failed to unlist: ${error.response?.data?.message || error.message}`,
          );
        }
      };

      return (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#4c505c33] p-2">
          <Avatar text={item.tick} />
          <div className="font-semibold">{transfer.amount}</div>
          <div className="flex gap-2">
            {!isListed ? (
              <Dialog>
                <DialogTrigger className="font-inherit inline-flex w-auto cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#8fc5ff] px-4 py-2 text-base font-bold text-[#007aff] transition-all duration-200 ease-in-out hover:bg-[#007aff] hover:text-white">
                  <IconTag size={20} stroke={2} className="text-current" />
                  <span className="ml-2">List</span>
                </DialogTrigger>
                <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                  <DialogHeader>
                    <DialogTitle>
                      <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#8fc5ff]">
                        List Prc-20 for sale
                      </div>
                    </DialogTitle>
                    <PrcListDialogContent item={item} transfer={transfer} />
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            ) : (
              <button
                onClick={handleUnlistTransfer}
                className="font-inherit inline-flex w-auto cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#1a1a1a] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
              >
                <IconTagOff size={20} stroke={2} className="text-current" />
                <span className="ml-2">Unlist</span>
              </button>
            )}
            <Dialog>
              <DialogTrigger
                disabled={isListed}
                className={`font-inherit inline-flex grow-0 items-center justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
                  isListed
                    ? "cursor-not-allowed bg-[#333] text-white/50"
                    : "cursor-pointer bg-[#3c1295] text-[#d94fff] hover:bg-[#9d12c8] hover:text-white"
                }`}
              >
                <IconSend size={20} stroke={2} className="text-current" />
              </DialogTrigger>
              <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                <DialogHeader>
                  <DialogTitle>
                    <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#d94fff]">
                      Send Prc-20
                    </div>
                  </DialogTitle>
                  <PrcSendDialogContent item={item} transfer={transfer} />
                </DialogHeader>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <Avatar text={item.tick} xl />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                {item.tick}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-2 w-full">
          <div className="h-52 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-white">
                <Spinner className="size-6" />
              </div>
            ) : prcBalance.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-white/60">
                No transfers available
              </div>
            ) : (
              <div className="my-2 flex flex-col gap-2 px-1 text-white">
                {prcBalance.map((transfer: any, index: number) => (
                  <TransferRow key={index} transfer={transfer} />
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  function PrcListDialogContent({
    item,
    transfer,
  }: {
    item: any;
    transfer: any;
  }) {
    const [price, setPrice] = useState<Number>(0);
    const [loading, setLoading] = useState(false);

    const inscriptionId = transfer.outpoint.split(":")[0] + "i0";

    async function handlePrc20List() {
      if (Number(price) <= 0) {
        toast.error("Please enter a valid price");
        return;
      }

      if (!privateKey) {
        toast.error("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setLoading(true);

        // Step 1: Find the UTXO containing the inscription
        const inscriptionUtxo = await findInscriptionUTXO(
          walletAddress,
          inscriptionId,
        );

        // Step 2: Create PSBT for the listing
        const psbtBase64 = await createListingPSBT(
          inscriptionUtxo,
          Number(price),
          privateKey,
          walletAddress,
        );

        // Step 3: Save prc20 listing to database with PSBT
        await apiClient.post("/prc20-listings/list", {
          inscriptionId,
          prc20Label: item.tick,
          amount: Number(transfer.amount),
          priceSats: Number(price),
          sellerAddress: walletAddress,
          psbtBase64: psbtBase64,
        });

        toast.success("Prc20 listed successfully!");
        setLoading(false);
        // Refresh the wallet data using React Query
        await queryClient.invalidateQueries({
          queryKey: ["myWalletPrc20", walletAddress],
          refetchType: "active",
        });
      } catch (error: any) {
        setLoading(false);
        console.error(error);
        toast.error(
          `Failed to list prc20: ${error.response?.data?.message || error.message}`,
        );
      }
    }

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <Avatar text={item.tick} xl />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                Amount: {transfer.amount}
              </div>
            </div>
          </div>
        </div>

        <div className="my-4 flex w-full items-center justify-center">
          <div className="mr-8 ml-14 pt-4 font-semibold">Price:</div>
          <Image
            src="/assets/coin.gif"
            alt="coin"
            width={18}
            height={18}
            priority
            className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
          />
          <input
            type="number"
            value={Number(price)}
            onChange={(e) => setPrice(Number(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "." || e.key === "e" || e.key === "-") {
                e.preventDefault();
              }
            }}
            className="font-inherit mr-2 w-20 max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
          />
        </div>
        <div className="mt-2 flex justify-center leading-8">
          <div className="mr-8 w-1/2 text-right">Maker fee (1.4%):</div>
          <div className="flex w-1/2 text-left">
            {price !== 0 && (
              <>
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />
                <span>{(Number(price) * 0.014).toFixed(2)}</span>
                <span className="text-[#fffc]">
                  ($
                  {(Number(price) * 0.014 * pepecoinPrice).toFixed(2)})
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-center leading-8">
          <div className="mr-8 w-1/2 text-right">You will receive:</div>
          <div className="flex w-1/2 text-left">
            {price !== 0 && (
              <>
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />

                <span>{(Number(price) * 0.986).toFixed(2)}</span>
                <span className="text-[#fffc]">
                  ($
                  {(Number(price) * 0.986 * pepecoinPrice).toFixed(2)})
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handlePrc20List}
          disabled={loading || Number(price) <= 0}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            loading || Number(price) <= 0
              ? "bg-[#1a1a1a]"
              : "bg-[#007aff] hover:bg-[#3b82f6]"
          }`}
        >
          {loading ? "Listing..." : "Confirm Listing"}
        </button>
      </>
    );
  }

  function PrcSendDialogContent({
    item,
    transfer,
  }: {
    item: any;
    transfer: any;
  }) {
    const [toAddress, setToAddress] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const inscriptionId = transfer.outpoint.split(":")[0] + "i0";

    const validateAddress = (address: string) =>
      /^[P][a-zA-Z0-9]{25,34}$/.test(address);

    useEffect(() => {
      setIsValid(validateAddress(toAddress));
    }, [toAddress]);

    async function handlePrc20Send() {
      if (!isValid || !toAddress) {
        setMessage("Please enter a valid Pepecoin address");
        return;
      }

      if (!privateKey) {
        setMessage("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        setIsLoading(true);
        setMessage("Finding inscription UTXO...");

        // Step 1: Find the UTXO containing the inscription
        const inscriptionUtxo = await findInscriptionUTXO(
          walletAddress,
          inscriptionId,
        );

        console.log("Found inscription UTXO:", inscriptionUtxo);

        setMessage("Creating transaction...");

        // Step 2: Send the inscription
        const txid = await sendInscriptionTransaction(
          inscriptionUtxo,
          privateKey,
          walletAddress,
          toAddress,
        );

        console.log("Transaction broadcast:", txid);

        setMessage("Recording transaction...");

        // Step 3: Record the send in the database
        await apiClient.post("/prc20-listings/send", {
          inscriptionId,
          prc20Label: item.tick,
          amount: Number(transfer.amount),
          fromAddress: walletAddress,
          toAddress: toAddress,
          txid: txid,
        });

        setMessage(
          `✅ Prc20 sent successfully!\n\nTransaction ID: ${txid.slice(0, 8)}...${txid.slice(-8)}`,
        );

        // Wait 2 seconds then reload
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } catch (error: any) {
        console.error("Send error:", error);
        setMessage(`❌ Failed to send: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <Avatar text={item.tick} xl />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                Amount: {transfer.amount}
              </div>
            </div>
          </div>
        </div>
        <div className="my-4 flex w-full items-center justify-center">
          <div className="mr-4 text-[1.1rem] font-semibold">Send to:</div>
          <input
            className="font-inherit mr-2 w-full max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value.trim())}
          />
        </div>

        <div className="mt-12 flex justify-center text-[0.9rem] leading-8">
          <div className="mr-8 w-1/2 text-right">Network fee:</div>
          <div className="flex w-1/2 text-left">
            <Image
              src="/assets/coin.gif"
              alt="coin"
              width={18}
              height={18}
              priority
              className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
            />
            <span>~0.016</span>
            <span className="text-[#fffc]"> ($0.00)</span>
          </div>
        </div>

        <button
          disabled={!isValid || isLoading}
          onClick={handlePrc20Send}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            !isValid ? "bg-[#1a1a1a]" : "bg-[#007aff]"
          }`}
        >
          {isLoading
            ? "Creating transfer"
            : isValid
              ? "Confirm"
              : "Enter valid address"}
        </button>

        {message && (
          <div className="mt-3 text-center text-sm break-all text-[#dfc0fd]">
            {message}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <h1 className="leading-[1.1 ] text-3xl">
        {walletAddress === address ? "My wallet" : address}
      </h1>
      <Tabs value={tab} onValueChange={handleChange} className="relative">
        <TabsList className="my-4 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
          <div className="my-2 flex list-none gap-5 overflow-x-auto p-0 select-none">
            <TabsTrigger value="prc" className="text-md">
              PRC-20
            </TabsTrigger>
            <TabsTrigger value="nfts" className="text-md">
              NFTs
            </TabsTrigger>
            <TabsTrigger value="pepemaps" className="text-md">
              Pepemaps
            </TabsTrigger>
            <TabsTrigger value="history" className="text-md">
              History
            </TabsTrigger>
            <TabsContent
              value="nfts"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
            <TabsContent
              value="pepemaps"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <Filter />
              </button>
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
            <TabsContent
              value="history"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
          </div>
        </TabsList>
        <TabsContent value="prc">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead></TableHead>
                <TableHead>Tick</TableHead>
                <TableHead>Total balance</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Inscribed</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              {ticks.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="px-auto w-auto text-center">
                    <Link href={`/${item.tick}`}>
                      <Avatar text={item.tick} />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/${item.tick}`}>{item.tick}</Link>
                  </TableCell>
                  <TableCell>
                    {Number(item.balance) + Number(item.transferable_balance)}
                  </TableCell>
                  <TableCell>{item.balance}</TableCell>
                  <TableCell>{item.transferable_balance}</TableCell>
                  <TableCell>
                    <div className="flex">
                      <Image
                        src="/assets/coin.gif"
                        alt="coin"
                        width={18}
                        height={18}
                        priority
                        className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                      />
                      -
                    </div>
                    <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                      $-
                    </div>
                  </TableCell>
                  {walletAddress === address && (
                    <>
                      <TableCell className="w-20">
                        <Dialog>
                          <DialogTrigger className="font-inherit inline-flex w-auto cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#00c85342] px-4 py-2 text-base font-bold text-[#00c853] transition-all duration-200 ease-in-out hover:bg-[#00c853] hover:text-white disabled:bg-[#333] disabled:text-white">
                            Inscribe
                          </DialogTrigger>
                          <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                            <DialogHeader>
                              <DialogTitle>
                                <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#00c853]">
                                  Inscribe Prc-20
                                </div>
                              </DialogTitle>
                              <PrcInscribeDialogContent item={item} />
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell className="w-20">
                        <Dialog>
                          <DialogTrigger
                            disabled={item.transfers_count == 0}
                            className="font-inherit inline-flex w-auto cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#3d301b] px-4 py-2 text-base font-bold text-[#fea326] transition-all duration-200 ease-in-out hover:bg-[#B8860B] hover:text-white disabled:cursor-auto disabled:bg-[#333] disabled:text-white"
                          >
                            Transfers
                          </DialogTrigger>
                          <DialogContent className="my-[50px] box-border flex min-h-[400px] max-w-[calc(100%-1rem)] min-w-[480px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                            <DialogHeader>
                              <DialogTitle>
                                <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#fea326]">
                                  List & Send Prc-20
                                </div>
                              </DialogTitle>
                              <PrcTransfersDialogContent item={item} />
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <h2 className="mt-16 mb-5 text-2xl leading-[1.1]">Activity</h2>
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>Inscription</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Tick</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            {isLoadingActivity ? (
              <TableFooter className="bg-transparent text-center text-[16px]">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7}>
                    <Spinner className="m-auto size-6" />
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : (
              <>
                {activity ? (
                  <TableBody className="text-[16px]">
                    {activity.map((item: any, index) => (
                      <TableRow
                        key={index}
                        className="cursor-pointer text-[16px] text-white transition-all duration-150 ease-in-out"
                      >
                        <TableCell>
                          <Link
                            href={`/inscription/${item.inscriptionId}`}
                            className="cursor-pointer font-medium text-[#dfc0fd] decoration-inherit"
                          >
                            {item.inscriptionId.slice(0, 3) +
                              "..." +
                              item.inscriptionId.slice(-3)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.status == "transfer" && (
                            <>
                              inscribe-
                              <br />
                              transfer
                            </>
                          )}
                          {item.status == "sold" && "transfer"}
                        </TableCell>
                        <TableCell>{item.prc20Label}</TableCell>
                        <TableCell>
                          {Number(item.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/wallet/${item.sellerAddress}`}
                            className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                          >
                            {item.sellerAddress.slice(0, 5) +
                              "..." +
                              item.sellerAddress.slice(-5)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.buyerAddress && (
                            <Link
                              href={`/wallet/${item.buyerAddress}`}
                              className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                            >
                              {item.buyerAddress.slice(0, 5) +
                                "..." +
                                item.buyerAddress.slice(-5)}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.createdAt.slice(0, 10)}
                          <br />
                          {item.createdAt.slice(11, 19)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                ) : (
                  <TableFooter className="bg-transparent text-center text-[16px]">
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7}>nothing to show</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </>
            )}
          </Table>
        </TabsContent>
        <TabsContent value="nfts">
          <div className="relative flex">
            <div className="relative grow overflow-hidden">
              {isLoadingInscriptions ? (
                <div className="py-8 text-center">Loading NFTs...</div>
              ) : inscriptions.filter((item) => item.content === null)
                  .length === 0 ? (
                <div className="py-8 text-center">
                  No NFTs found in this wallet
                </div>
              ) : (
                <>
                  {isCollectionsLoading && (
                    <div className="py-2 text-center text-sm text-gray-400">
                      Loading collections data...
                    </div>
                  )}
                  {collectionsError && (
                    <div className="py-2 text-center text-sm text-red-400">
                      Error loading collections: {collectionsError.message}
                    </div>
                  )}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-5">
                    {inscriptions
                      .filter((item) => item.content === null)
                      .map((item, index) => (
                        <div
                          key={index}
                          className="relative flex flex-col items-center overflow-hidden rounded-xl border-2 border-transparent bg-[#4c505c33] p-4 text-center transition-all duration-150 ease-in-out"
                        >
                          <div className="flex h-32 w-32 items-center justify-center">
                            <Link
                              href={`/inscription/${item.inscription_id}`}
                              className="h-full w-full"
                            >
                              <Image
                                src={`${ORD_API_BASE}/content/${item.inscription_id}`}
                                alt="nft"
                                width={128}
                                height={128}
                                className="pointer-events-none h-full max-h-32 w-auto max-w-32 rounded-xl bg-[#444] object-contain text-[0.8rem] select-none"
                                unoptimized
                              />
                            </Link>
                          </div>
                          <div className="my-1.5 flex w-full justify-center text-[1.1rem] leading-[1.2]">
                            <span></span>
                            <span className="ml-4"></span>
                          </div>
                          <div className="mt-auto w-full border-t border-white/10 py-2">
                            <div className="text-[0.9rem] text-[#dfc0fd] hover:text-[#c891ff]">
                              <Link
                                href={`/inscription/${item.inscription_id}`}
                              >
                                #{item.inscription_number}
                              </Link>
                            </div>
                          </div>
                          {walletAddress === address && (
                            <div className="flex w-full gap-2.5">
                              {listingStatuses.get(item.inscription_id)
                                ?.status !== "listed" ? (
                                <Dialog>
                                  <DialogTrigger
                                    disabled={
                                      !inscriptionIdsInCollections.includes(
                                        item.inscription_id,
                                      )
                                    }
                                    className="font-inherit inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#8fc5ff] px-4 py-2 text-base font-bold text-[#007aff] transition-all duration-200 ease-in-out hover:bg-[#007aff] hover:text-white disabled:cursor-auto disabled:bg-[#333] disabled:text-white"
                                  >
                                    <IconTag
                                      size={20}
                                      stroke={2}
                                      className="text-current"
                                    />
                                    <span className="ml-2">List</span>
                                  </DialogTrigger>
                                  <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                                    <DialogHeader>
                                      <DialogTitle>
                                        <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#8fc5ff]">
                                          List NFT for sale
                                        </div>
                                      </DialogTitle>
                                      <ListDialogContent item={item} />
                                    </DialogHeader>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <button
                                  onClick={() => handleUnlist(item)}
                                  className="font-inherit inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#1a1a1a] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
                                >
                                  <IconTagOff
                                    size={20}
                                    stroke={2}
                                    className="text-current"
                                  />
                                  <span className="ml-2">Unlist</span>
                                </button>
                              )}
                              <Dialog>
                                <DialogTrigger
                                  disabled={
                                    listingStatuses.get(item.inscription_id)
                                      ?.status === "listed"
                                  }
                                  className="font-inherit inline-flex grow-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#3c1295] px-4 py-2 text-base font-bold text-[#d94fff] transition-all duration-200 ease-in-out hover:bg-[#9d12c8] hover:text-white disabled:cursor-auto disabled:bg-[#333] disabled:text-white"
                                >
                                  <IconSend2
                                    size={20}
                                    stroke={2}
                                    className="text-current"
                                  />
                                </DialogTrigger>
                                <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                                  <DialogHeader>
                                    <DialogTitle>
                                      <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#d94fff]">
                                        Send NFT
                                      </div>
                                    </DialogTitle>
                                    <SendDialogContent item={item} />
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="pepemaps">
          <div className="relative flex">
            <div className="relative grow overflow-hidden">
              {isLoadingInscriptions ? (
                <div className="py-8 text-center">Loading Pepemaps...</div>
              ) : inscriptions.filter(
                  (item) =>
                    typeof item.content === "string" &&
                    item.content.endsWith(".pepemap"),
                ).length === 0 ? (
                <div className="py-8 text-center">
                  No Pepemaps found in this wallet
                </div>
              ) : (
                <>
                  {isCollectionsLoading && (
                    <div className="py-2 text-center text-sm text-gray-400">
                      Loading pepemaps data...
                    </div>
                  )}
                  {collectionsError && (
                    <div className="py-2 text-center text-sm text-red-400">
                      Error loading pepemaps: {collectionsError.message}
                    </div>
                  )}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-5">
                    {inscriptions
                      .filter(
                        (item) =>
                          typeof item.content === "string" &&
                          item.content.endsWith(".pepemap"),
                      )
                      .map((item, index) => (
                        <div
                          key={index}
                          className="relative flex flex-col items-center overflow-hidden rounded-xl border-2 border-transparent bg-[#4c505c33] p-4 text-center transition-all duration-150 ease-in-out"
                        >
                          <div className="flex h-32 w-32 items-center justify-center">
                            <PepemapImage item={item} />
                          </div>
                          <div className="my-1.5 flex w-full justify-center text-[1.1rem] leading-[1.2]">
                            <span>{item.content}</span>
                          </div>
                          <div className="mt-auto w-full border-t border-white/10 py-2">
                            <div className="text-[0.9rem] text-[#dfc0fd] hover:text-[#c891ff]">
                              <Link
                                href={`/inscription/${item.inscription_id}`}
                              >
                                #{item.inscription_number}
                              </Link>
                            </div>
                          </div>
                          {walletAddress === address && (
                            <div className="flex w-full gap-2.5">
                              {pepemapListingStatuses.get(item.inscription_id)
                                ?.status !== "listed" ? (
                                <Dialog>
                                  <DialogTrigger
                                    disabled={
                                      !inscriptionIdsInPepemaps.includes(
                                        item.inscription_id,
                                      )
                                    }
                                    className="font-inherit inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#8fc5ff] px-4 py-2 text-base font-bold text-[#007aff] transition-all duration-200 ease-in-out hover:bg-[#007aff] hover:text-white disabled:cursor-auto disabled:bg-[#333] disabled:text-white"
                                  >
                                    <IconTag
                                      size={20}
                                      stroke={2}
                                      className="text-current"
                                    />
                                    <span className="ml-2">List</span>
                                  </DialogTrigger>
                                  <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                                    <DialogHeader>
                                      <DialogTitle>
                                        <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#8fc5ff]">
                                          List Pepemap for sale
                                        </div>
                                      </DialogTitle>
                                      <PepemapListDialogContent item={item} />
                                    </DialogHeader>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <button
                                  onClick={() => handlePepemapUnlist(item)}
                                  className="font-inherit inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#1a1a1a] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
                                >
                                  <IconTagOff
                                    size={20}
                                    stroke={2}
                                    className="text-current"
                                  />
                                  <span className="ml-2">Unlist</span>
                                </button>
                              )}
                              <Dialog>
                                <DialogTrigger
                                  disabled={
                                    pepemapListingStatuses.get(
                                      item.inscription_id,
                                    )?.status === "listed" ||
                                    !inscriptionIdsInPepemaps.includes(
                                      item.inscription_id,
                                    )
                                  }
                                  className="font-inherit inline-flex grow-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#3c1295] px-4 py-2 text-base font-bold text-[#d94fff] transition-all duration-200 ease-in-out hover:bg-[#9d12c8] hover:text-white disabled:cursor-auto disabled:bg-[#333] disabled:text-white"
                                >
                                  <IconSend2
                                    size={20}
                                    stroke={2}
                                    className="text-current"
                                  />
                                </DialogTrigger>
                                <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                                  <DialogHeader>
                                    <DialogTitle>
                                      <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#d94fff]">
                                        Send Pepemap
                                      </div>
                                    </DialogTitle>
                                    <PepemapSendDialogContent item={item} />
                                  </DialogHeader>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="history">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>Item</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            {isLoadingHistory ? (
              <TableFooter className="bg-transparent text-center text-[16px]">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6}>
                    <Spinner className="m-auto size-6" />
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : (
              <>
                {history ? (
                  <TableBody>
                    {history.map((item: any, index) => (
                      <TableRow
                        key={index}
                        className="cursor-pointer text-[16px] text-white transition-all duration-150 ease-in-out"
                      >
                        <TableCell>
                          <div className="flex items-center gap-x-[1.2rem]">
                            <Link href={`/inscription/${item.inscriptionId}`}>
                              {item.type == "prc20" && (
                                <Avatar text={item.prc20Label} />
                              )}
                              {item.type == "pepemap" && (
                                <PepemapImage item={item} sm />
                              )}
                              {item.type == "nft" && (
                                <Image
                                  src={`${ORD_API_BASE}/content/${item.inscriptionId}`}
                                  alt={`Inscription #${item.inscriptionId}`}
                                  width={32}
                                  height={32}
                                  className="h-12 w-12 shrink-0 rounded-xl object-cover [image-rendering:pixelated]"
                                  unoptimized
                                />
                              )}
                            </Link>

                            <div>
                              <span className="leading-[1.1]">
                                {item.type == "prc20" &&
                                  Number(item.amount).toLocaleString() +
                                    "/" +
                                    item.prc20Label}
                                {item.type == "pepemap" && item.pepemapLabel}
                                {item.type == "nft" && item.collectionName}
                              </span>
                              <div className="leading-none">
                                <Link
                                  href={`/inscription/${item.inscriptionId}`}
                                  className="text-[0.7rem] text-[#dfc0fd]"
                                >
                                  {item.inscriptionId.slice(0, 3) +
                                    "..." +
                                    item.inscriptionId.slice(-3)}
                                </Link>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.status == "sold" && (
                            <>
                              {item.sellerAddress == address ? (
                                <span className="rounded-[6px] bg-[#00d1814d] px-1 py-0.5 text-[0.8rem] text-[#00d181]">
                                  sell
                                </span>
                              ) : (
                                <span className="rounded-[6px] bg-[#00d1814d] px-1 py-0.5 text-[0.8rem] text-[#00d181]">
                                  buy
                                </span>
                              )}
                            </>
                          )}
                          {item.status == "unlisted" && (
                            <span className="rounded-[6px] bg-[#dc35454d] px-1 py-0.5 text-[0.8rem] text-[#dc3545]">
                              unlist
                            </span>
                          )}
                          {item.status == "listed" && (
                            <span className="rounded-[6px] bg-[#027dff4d] px-1 py-0.5 text-[0.8rem] text-[#027dff]">
                              list
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.status != "unlisted" ? (
                            <>
                              <div className="flex">
                                <Image
                                  src="/assets/coin.gif"
                                  alt="coin"
                                  width={18}
                                  height={18}
                                  priority
                                  className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                />
                                {Number(item.priceSats).toLocaleString()}
                              </div>
                              {item.type == "prc20" && (
                                <div className="flex text-[0.9rem]">
                                  <Image
                                    src="/assets/coin.gif"
                                    alt="coin"
                                    width={16}
                                    height={16}
                                    priority
                                    className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                  />
                                  {formatPrice(item.priceSats / item.amount)}/
                                  {item.prc20Label}
                                </div>
                              )}
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/wallet/${item.sellerAddress}`}
                            className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                          >
                            {item.sellerAddress.slice(0, 5) +
                              "..." +
                              item.sellerAddress.slice(-5)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.buyerAddress && (
                            <Link
                              href={`/wallet/${item.buyerAddress}`}
                              className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                            >
                              {item.buyerAddress.slice(0, 5) +
                                "..." +
                                item.buyerAddress.slice(-5)}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.createdAt.slice(0, 10)}
                          <br />
                          {item.createdAt.slice(11, 19)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                ) : (
                  <TableFooter className="bg-transparent text-center text-[16px]">
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6}>nothing to show</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </>
            )}
          </Table>
        </TabsContent>
      </Tabs>
    </>
  );
}
