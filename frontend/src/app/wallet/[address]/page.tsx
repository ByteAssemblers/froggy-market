"use client";
import { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { blockchainClient, apiClient } from "@/lib/axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { sendInscriptionTransaction } from "@/lib/wallet/sendInscription";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

// PepemapImage component
function PepemapImage({ item }: { item: any }) {
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
      width={128}
      height={128}
      className={`pointer-events-none h-full max-h-32 w-auto max-w-32 rounded-xl object-contain text-[0.8rem] select-none ${
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

  // useEffect(() => {
  //   const fetchWalletPrcHistory = async () => {
  //     try {
  //       const response = await fetch(
  //         `/api/belindex/address/${address}/history`,
  //       );
  //       const data = await response.json();
  //       console.log(data);
  //     } catch (error) {
  //       console.error("Error fetching prc-20 history", error);
  //     }
  //   };

  //   if (address) {
  //     fetchWalletPrcHistory();
  //   }
  // }, [address]);

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

  // Get all inscription IDs from pepemaps
  const inscriptionIdsInPepemaps =
    pepemaps?.map((pepemap: any) => pepemap.inscription_id) || [];

  const handleUnlist = async (item: any) => {
    try {
      await apiClient.post("/listings/unlist", {
        inscriptionId: item.inscription_id,
        sellerAddress: walletAddress,
      });

      alert("NFT unlisted successfully!");
      // Refresh the wallet data
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(
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

      alert("Pepemap unlisted successfully!");
      // Refresh the wallet data
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(
        `Failed to unlist: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  const handlePrcUnlist = async (item: any) => {
    try {
      await apiClient.post("/prc20-listings/unlist", {
        inscriptionId: item.inscription_id,
        sellerAddress: walletAddress,
      });

      alert("Prc20 unlisted successfully!");
      // Refresh the wallet data
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(
        `Failed to unlist: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  function ListDialogContent({ item }: { item: any }) {
    const [price, setPrice] = useState<Number>(0);
    const [loading, setLoading] = useState(false);

    async function handleList() {
      if (Number(price) <= 0) {
        alert("Please enter a valid price");
        return;
      }

      if (!privateKey) {
        alert("Wallet not connected. Please unlock your wallet.");
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

        alert("NFT listed successfully!");
        setLoading(false);
        // Refresh the page to show updated status
        window.location.reload();
      } catch (error: any) {
        setLoading(false);
        console.error(error);
        alert(
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
            <span>~0.00015</span>
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
        alert("Please enter a valid price");
        return;
      }

      if (!privateKey) {
        alert("Wallet not connected. Please unlock your wallet.");
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

        alert("Pepemap listed successfully!");
        setLoading(false);
        // Refresh the page to show updated status
        window.location.reload();
      } catch (error: any) {
        setLoading(false);
        console.error(error);
        alert(
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
            <span>~0.00015</span>
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
        await processJob(
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
    console.log(statusMessage);
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
            <span>~0.00015</span>
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

  function PrcListeDialogContent({ item }: { item: any }) {
    const [price, setPrice] = useState<Number>(0);
    const [loading, setLoading] = useState(false);

    async function handlePrc20List() {
      if (Number(price) <= 0) {
        alert("Please enter a valid price");
        return;
      }

      if (!privateKey) {
        alert("Wallet not connected. Please unlock your wallet.");
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

        // Step 3: Save prc20 listing to database with PSBT
        await apiClient.post("/prc20-listings/list", {
          inscriptionId: item.inscription_id,
          prc20Label: item.content,
          priceSats: Number(price),
          sellerAddress: walletAddress,
          psbtBase64: psbtBase64,
        });

        alert("Prc20 listed successfully!");
        setLoading(false);
        // Refresh the page to show updated status
        window.location.reload();
      } catch (error: any) {
        setLoading(false);
        console.error(error);
        alert(
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
                {item.tick}
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

  function PrcSendDialogContent({ item }: { item: any }) {
    const [toAddress, setToAddress] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

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
        await apiClient.post("/prc20-listings/send", {
          inscriptionId: item.inscription_id,
          prc20Label: item.content,
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
                {item.tick}
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
            <span>~0.00015</span>
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

  console.log(ticks);
  return (
    <>
      <h1 className="leading-[1.1 ] text-3xl">
        {walletAddress === address ? "My wallet" : address}
      </h1>
      <Tabs defaultValue="prc" className="relative">
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
                      <TableCell className="flex flex-row gap-2">
                        <Dialog>
                          <DialogTrigger className="font-inherit inline-flex w-auto flex-1 items-center justify-center rounded-xl border border-transparent bg-[#00c85342] px-4 py-2 text-base font-bold text-[#00c853] transition-all duration-200 ease-in-out hover:bg-[#00c853] hover:text-white disabled:bg-[#333] disabled:text-white">
                            Inscribe
                          </DialogTrigger>
                          <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                            <DialogHeader>
                              <DialogTitle>
                                <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#00c853]">
                                  Inscribe Prc-20
                                </div>
                              </DialogTitle>
                              <DialogDescription></DialogDescription>

                              <PrcInscribeDialogContent item={item} />
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                        <Dialog>
                          <DialogTrigger className="font-inherit inline-flex w-auto items-center justify-center rounded-xl border border-transparent bg-[#8fc5ff] px-4 py-2 text-base font-bold text-[#007aff] transition-all duration-200 ease-in-out hover:bg-[#007aff] hover:text-white disabled:bg-[#333] disabled:text-white">
                            <svg
                              data-v-51cc9e0e=""
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              width="20"
                              height="20"
                            >
                              <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M3 11.172V5a2 2 0 0 1 2-2h6.172a2 2 0 0 1 1.414.586l8 8a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0l-8-8A2 2 0 0 1 3 11.172zM7 7h.001"
                              ></path>
                            </svg>
                            <span className="ml-2">List</span>
                          </DialogTrigger>
                          <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                            <DialogHeader>
                              <DialogTitle>
                                <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#8fc5ff]">
                                  List Prc-20 for sale
                                </div>
                              </DialogTitle>
                              <DialogDescription></DialogDescription>

                              <PrcListeDialogContent item={item} />
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                        {/* <button
                          onClick={() => handlePrcUnlist(item)}
                          className="font-inherit inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-[#1a1a1a] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
                        >
                          <svg
                            data-v-51cc9e0e=""
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            width="20"
                            height="20"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="m14 5-1.414-1.414A2 2 0 0 0 11.172 3H5a2 2 0 0 0-2 2v6.172a2 2 0 0 0 .586 1.414L5 14m14-4 1.586 1.586a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0L10 19M7 7h.001M21 3 3 21"
                            ></path>
                          </svg>
                          <span className="ml-2">Unlist</span>
                        </button> */}
                        <Dialog>
                          <DialogTrigger className="font-inherit inline-flex grow-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#3c1295] px-4 py-2 text-base font-bold text-[#d94fff] transition-all duration-200 ease-in-out hover:bg-[#9d12c8] hover:text-white">
                            <svg
                              data-v-51cc9e0e=""
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              width="20"
                              height="20"
                            >
                              <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="m6 12-3 9 18-9L3 3l3 9zm0 0h6"
                              ></path>
                            </svg>
                          </DialogTrigger>
                          <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                            <DialogHeader>
                              <DialogTitle>
                                <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#d94fff]">
                                  Send Prc-20
                                </div>
                              </DialogTitle>
                              <DialogDescription></DialogDescription>
                              <PrcSendDialogContent item={item} />
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
            <TableBody className="text-[16px]">
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Link
                      href="/inscription/a93204a8caa7ba24ab3425974277fb39953773101ef0c22e47b8bb15081d777ei0"
                      className="cursor-pointer font-medium text-[#dfc0fd] decoration-inherit"
                    >
                      a93...ei0
                    </Link>
                  </TableCell>
                  <TableCell>receive</TableCell>
                  <TableCell>damm</TableCell>
                  <TableCell>1000</TableCell>
                  <TableCell>
                    <Link
                      href="wallet/DNKjZ3Tt3bwrVPFkvF43T8WcncXjDoXKVY"
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      DNKjZ...oXKVY
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href="wallet/DRjY9RJfhQGLxmwa4EVh66az2KuXyzh1tB"
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      DRjY9...zh1tB
                    </Link>
                  </TableCell>
                  <TableCell>
                    15.12.2023
                    <br />
                    23:24:54
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
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
                                    className="font-inherit inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-[#8fc5ff] px-4 py-2 text-base font-bold text-[#007aff] transition-all duration-200 ease-in-out hover:bg-[#007aff] hover:text-white disabled:bg-[#333] disabled:text-white"
                                  >
                                    <svg
                                      data-v-51cc9e0e=""
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      width="20"
                                      height="20"
                                    >
                                      <path
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M3 11.172V5a2 2 0 0 1 2-2h6.172a2 2 0 0 1 1.414.586l8 8a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0l-8-8A2 2 0 0 1 3 11.172zM7 7h.001"
                                      ></path>
                                    </svg>
                                    <span className="ml-2">List</span>
                                  </DialogTrigger>
                                  <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                                    <DialogHeader>
                                      <DialogTitle>
                                        <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#8fc5ff]">
                                          List NFT for sale
                                        </div>
                                      </DialogTitle>
                                      <DialogDescription></DialogDescription>

                                      <ListDialogContent item={item} />
                                    </DialogHeader>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <button
                                  onClick={() => handleUnlist(item)}
                                  className="font-inherit inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-[#1a1a1a] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
                                >
                                  <svg
                                    data-v-51cc9e0e=""
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    width="20"
                                    height="20"
                                  >
                                    <path
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="m14 5-1.414-1.414A2 2 0 0 0 11.172 3H5a2 2 0 0 0-2 2v6.172a2 2 0 0 0 .586 1.414L5 14m14-4 1.586 1.586a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0L10 19M7 7h.001M21 3 3 21"
                                    ></path>
                                  </svg>
                                  <span className="ml-2">Unlist</span>
                                </button>
                              )}
                              <Dialog>
                                <DialogTrigger className="font-inherit inline-flex grow-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#3c1295] px-4 py-2 text-base font-bold text-[#d94fff] transition-all duration-200 ease-in-out hover:bg-[#9d12c8] hover:text-white">
                                  <svg
                                    data-v-51cc9e0e=""
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    width="20"
                                    height="20"
                                  >
                                    <path
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="m6 12-3 9 18-9L3 3l3 9zm0 0h6"
                                    ></path>
                                  </svg>
                                </DialogTrigger>
                                <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                                  <DialogHeader>
                                    <DialogTitle>
                                      <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#d94fff]">
                                        Send NFT
                                      </div>
                                    </DialogTitle>
                                    <DialogDescription></DialogDescription>
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
                                    className="font-inherit inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-[#8fc5ff] px-4 py-2 text-base font-bold text-[#007aff] transition-all duration-200 ease-in-out hover:bg-[#007aff] hover:text-white disabled:bg-[#333] disabled:text-white"
                                  >
                                    <svg
                                      data-v-51cc9e0e=""
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      width="20"
                                      height="20"
                                    >
                                      <path
                                        stroke="currentColor"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M3 11.172V5a2 2 0 0 1 2-2h6.172a2 2 0 0 1 1.414.586l8 8a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0l-8-8A2 2 0 0 1 3 11.172zM7 7h.001"
                                      ></path>
                                    </svg>
                                    <span className="ml-2">List</span>
                                  </DialogTrigger>
                                  <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                                    <DialogHeader>
                                      <DialogTitle>
                                        <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#8fc5ff]">
                                          List Pepemap for sale
                                        </div>
                                      </DialogTitle>
                                      <DialogDescription></DialogDescription>

                                      <PepemapListDialogContent item={item} />
                                    </DialogHeader>
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <button
                                  onClick={() => handlePepemapUnlist(item)}
                                  className="font-inherit inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-[#1a1a1a] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
                                >
                                  <svg
                                    data-v-51cc9e0e=""
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    width="20"
                                    height="20"
                                  >
                                    <path
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="m14 5-1.414-1.414A2 2 0 0 0 11.172 3H5a2 2 0 0 0-2 2v6.172a2 2 0 0 0 .586 1.414L5 14m14-4 1.586 1.586a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0L10 19M7 7h.001M21 3 3 21"
                                    ></path>
                                  </svg>
                                  <span className="ml-2">Unlist</span>
                                </button>
                              )}
                              <Dialog>
                                <DialogTrigger className="font-inherit inline-flex grow-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#3c1295] px-4 py-2 text-base font-bold text-[#d94fff] transition-all duration-200 ease-in-out hover:bg-[#9d12c8] hover:text-white">
                                  <svg
                                    data-v-51cc9e0e=""
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    width="20"
                                    height="20"
                                  >
                                    <path
                                      stroke="currentColor"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="m6 12-3 9 18-9L3 3l3 9zm0 0h6"
                                    ></path>
                                  </svg>
                                </DialogTrigger>
                                <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                                  <DialogHeader>
                                    <DialogTitle>
                                      <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#d94fff]">
                                        Send Pepemap
                                      </div>
                                    </DialogTitle>
                                    <DialogDescription></DialogDescription>
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
            <TableBody className="text-[16px]">
              <TableRow>
                <TableCell>nothing to show</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </>
  );
}
