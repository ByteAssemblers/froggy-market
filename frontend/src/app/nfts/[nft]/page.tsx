"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiClient } from "@/lib/axios";
import { completeBuyPSBT } from "@/lib/marketplace/psbt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Card } from "@/components/ui/card";
import {
  BrushCleaning,
  Check,
  EllipsisVertical,
  Filter,
  ShoppingCart,
  X,
} from "lucide-react";
import { FloorPriceChart } from "@/components/FloorPriceChart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/useProfile";
import { getPepecoinBalance } from "@/lib/wallet/getBalance";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/components/page/PRCTwenty";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

export default function NftPage({
  params,
}: {
  params: Promise<{ nft: string }>;
}) {
  const { nft } = use(params);

  const { pepecoinPrice } = useProfile();

  const [inscriptionsList, setInscriptionList] = useState<any | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);

  const {
    walletInfo,
    wallet,
    walletAddress,
    privateKey,
    collections,
    isCollectionsLoading,
    collectionsError,
    collectionInfo,
    isCollectionInfoLoading,
  } = useProfile();

  const isLoading = isCollectionsLoading || isCollectionInfoLoading;

  // Helper function to get collection stats by symbol
  const getCollectionStats = () => {
    if (!collectionInfo || !Array.isArray(collectionInfo)) return null;
    return collectionInfo.find((info: any) => info.symbol === nft);
  };

  const stats = getCollectionStats();

  useEffect(() => {
    walletInfo();
  }, []);

  useEffect(() => {
    if (collections && !isCollectionsLoading) {
      const collection = collections.find((col: any) => col.symbol === nft);
      setInscriptionList(collection.inscriptions);
      setSelectedCollection(collection);
    }
  }, [collections, isCollectionsLoading, nft]);

  const [selectedSort, setSelectedSort] = useState("Price: lowest first");
  const [selectedFilter, setSelectedFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  async function handleGetBalance() {
    if (!walletAddress) return;
    setLoadingBalance(true);
    const bal = await getPepecoinBalance(walletAddress);
    setBalance(bal);
    setLoadingBalance(false);
  }

  useEffect(() => {
    handleGetBalance();
  }, [wallet]);

  if (!inscriptionsList) return <div>Loading NFT info...</div>;

  const sortOptions = [
    "Price: lowest first",
    "Price: highest first",
    "Recently listed",
    "Inscription number: lowest first",
  ];

  // Filter to show only listed items (items with at least one activity/listing)
  const listedItems =
    inscriptionsList?.filter((item: any) => item.activities?.length > 0) || [];

  const ITEMS_PER_PAGE = 30;
  const totalPages = Math.ceil(listedItems.length / ITEMS_PER_PAGE);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = listedItems.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const handleBuy = async (item: any) => {
    if (!walletAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (!privateKey) {
      alert("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      const priceSats = item.activities[item.activities.length - 1].priceSats;

      // Step 1: Get the listing with PSBT from backend
      const listingResponse = await apiClient.get(
        `/listings/inscription/${item.inscriptionId}`,
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
        priceSats,
      );

      // Step 3: Update backend with the sale
      await apiClient.post("/listings/buy", {
        inscriptionId: item.inscriptionId,
        buyerAddress: walletAddress,
        priceSats: priceSats,
        txid: txid,
      });

      alert(`NFT purchased successfully! Transaction: ${txid}`);
      // Refresh to show updated status
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(
        `Failed to buy NFT: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  return (
    <>
      <div className="mt-4 mb-8 flex items-center">
        <Image
          src={`${ORD_API_BASE}/content/${selectedCollection.profileInscriptionId}`}
          alt={`Inscription #${selectedCollection.profileInscriptionId}`}
          width={112}
          height={112}
          className="mr-6 h-28 w-28 shrink-0 rounded-full object-cover [image-rendering:pixelated]"
          unoptimized
        />
        <div>
          <div className="flex flex-wrap items-center gap-x-12 gap-y-2">
            <div className="flex items-center gap-x-4">
              <h1 className="m-0 text-[2.3rem] leading-[1.1]">
                {selectedCollection.name}
              </h1>
              <svg
                data-v-1f7beb45=""
                viewBox="0 0 20 20"
                fill="#f2c511"
                className="badge"
                width="24"
                height="24"
              >
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                ></path>
              </svg>
            </div>
            <div className="flex">
              <Link
                href={selectedCollection.socialLink}
                className="mr-4 leading-none text-[#fffc]"
              >
                <svg
                  data-v-1f7beb45=""
                  viewBox="-1.6 -1.6 19.2 19.2"
                  fill="currentColor"
                  width="24"
                  height="24"
                >
                  <path d="M0 8a8 8 0 1116 0A8 8 0 010 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855-.143.268-.276.56-.395.872.705.157 1.472.257 2.282.287V1.077zM4.249 3.539c.142-.384.304-.744.481-1.078a6.7 6.7 0 01.597-.933A7.01 7.01 0 003.051 3.05c.362.184.763.349 1.198.49zM3.509 7.5c.036-1.07.188-2.087.436-3.008a9.124 9.124 0 01-1.565-.667A6.964 6.964 0 001.018 7.5h2.49zm1.4-2.741a12.344 12.344 0 00-.4 2.741H7.5V5.091c-.91-.03-1.783-.145-2.591-.332zM8.5 5.09V7.5h2.99a12.342 12.342 0 00-.399-2.741c-.808.187-1.681.301-2.591.332zM4.51 8.5c.035.987.176 1.914.399 2.741A13.612 13.612 0 017.5 10.91V8.5H4.51zm3.99 0v2.409c.91.03 1.783.145 2.591.332.223-.827.364-1.754.4-2.741H8.5zm-3.282 3.696c.12.312.252.604.395.872.552 1.035 1.218 1.65 1.887 1.855V11.91c-.81.03-1.577.13-2.282.287zm.11 2.276a6.696 6.696 0 01-.598-.933 8.853 8.853 0 01-.481-1.079 8.38 8.38 0 00-1.198.49 7.01 7.01 0 002.276 1.522zm-1.383-2.964A13.36 13.36 0 013.508 8.5h-2.49a6.963 6.963 0 001.362 3.675c.47-.258.995-.482 1.565-.667zm6.728 2.964a7.009 7.009 0 002.275-1.521 8.376 8.376 0 00-1.197-.49 8.853 8.853 0 01-.481 1.078 6.688 6.688 0 01-.597.933zM8.5 11.909v3.014c.67-.204 1.335-.82 1.887-1.855.143-.268.276-.56.395-.872A12.63 12.63 0 008.5 11.91zm3.555-.401c.57.185 1.095.409 1.565.667A6.963 6.963 0 0014.982 8.5h-2.49a13.36 13.36 0 01-.437 3.008zM14.982 7.5a6.963 6.963 0 00-1.362-3.675c-.47.258-.995.482-1.565.667.248.92.4 1.938.437 3.008h2.49zM11.27 2.461c.177.334.339.694.482 1.078a8.368 8.368 0 001.196-.49 7.01 7.01 0 00-2.275-1.52c.218.283.418.597.597.932zm-.488 1.343a7.765 7.765 0 00-.395-.872C9.835 1.897 9.17 1.282 8.5 1.077V4.09c.81-.03 1.577-.13 2.282-.287z"></path>
                </svg>
              </Link>
              {selectedCollection.myUrl && (
                <Link
                  href={selectedCollection.myUrl}
                  className="leading-none text-[#fffc]"
                >
                  <svg
                    data-v-1f7beb45=""
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                  >
                    <path
                      strokeWidth="1.5"
                      d="M11.3032 9.42806L16.4029 3.5H15.1945L10.7663 8.64725L7.2296 3.5H3.15039L8.49863 11.2836L3.15039 17.5H4.35894L9.03516 12.0644L12.7702 17.5H16.8494L11.3029 9.42806H11.3032ZM9.6479 11.3521L9.10601 10.5771L4.7944 4.40978H6.65066L10.1302 9.38698L10.6721 10.162L15.195 16.6316H13.3388L9.6479 11.3524V11.3521Z"
                      fill="currentColor"
                    ></path>
                  </svg>
                </Link>
              )}
            </div>
          </div>
          <div className="mt-2 leading-tight text-white/95">
            {selectedCollection.description}
          </div>
        </div>
      </div>
      <div className="mb-8">
        {isLoading ? (
          <div className="-ml-12 flex flex-wrap">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="mb-2 ml-12">
                <Skeleton className="mb-1 h-6 w-20 bg-[#4c505c33]" />
                <Skeleton className="h-4 w-16 bg-[#4c505c33]" />
              </div>
            ))}
          </div>
        ) : (
          <div className="-ml-12 flex flex-wrap">
            <div className="mb-2 ml-12">
              <div className="flex font-bold">
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />
                <span className="text-white/95">
                  {stats?.floorPrice ? formatPrice(stats.floorPrice) : "-"}
                </span>
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Floor price
              </div>
            </div>
            <div className="mb-2 ml-12">
              <div className="flex font-bold">
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />
                <span className="text-white/95">
                  {stats?.volume24h ? formatPrice(stats.volume24h) : "-"}
                </span>
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Volume (24h)
              </div>
            </div>
            <div className="mb-2 ml-12">
              <div className="flex font-bold">
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />
                <span className="text-white/95">
                  {stats?.totalVolume ? formatPrice(stats.totalVolume) : "-"}
                </span>
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Total volume
              </div>
            </div>
            <div className="mb-2 ml-12">
              <div className="font-bold">
                {stats?.trades24h !== undefined
                  ? stats.trades24h.toLocaleString()
                  : "-"}
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Trades (24h)
              </div>
            </div>
            <div className="mb-2 ml-12">
              <div className="font-bold">
                {stats?.owners !== undefined
                  ? stats.owners.toLocaleString()
                  : "-"}
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Owners
              </div>
            </div>
            <div className="mb-2 ml-12">
              <div className="font-bold">
                {stats?.supply !== undefined
                  ? stats.supply.toLocaleString()
                  : "-"}
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Supply
              </div>
            </div>
            <div className="mb-2 ml-12">
              <div className="font-bold">
                {stats?.listed !== undefined
                  ? stats.listed.toLocaleString()
                  : "-"}
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Listed
              </div>
            </div>
          </div>
        )}
      </div>
      <Tabs defaultValue="listings" className="relative">
        <TabsList className="my-4 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
          <div className="my-2 flex list-none gap-5 overflow-x-auto p-0 select-none">
            <TabsTrigger value="listings" className="text-md">
              Listings
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-md">
              Activity
            </TabsTrigger>
          </div>
          <TabsContent value="listings">
            <div className="absolute top-6 right-0 flex text-center text-white">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-pointer rounded-md p-[0.3rem] hover:bg-[#222]">
                    <BrushCleaning />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-white">Sweep</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mx-2 cursor-pointer rounded-md p-[0.3rem] hover:bg-[#222]">
                    <ShoppingCart />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-white">Bulk buy</TooltipContent>
              </Tooltip>
              <div
                className={`mr-2 cursor-pointer rounded-md p-[0.3rem] hover:bg-[#222] ${selectedFilter ? "bg-[#431e80] text-[#a974ff]" : "bg-transparent text-white"}`}
                onClick={() => setSelectedFilter(!selectedFilter)}
              >
                <Filter />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-md p-[0.3rem] hover:bg-[#222]">
                  <EllipsisVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-lg">
                  {sortOptions.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onClick={() => setSelectedSort(option)}
                      className="flex items-center"
                    >
                      <span>{option}</span>
                      {selectedSort === option && (
                        <Check className="ml-4 text-[#b064fd]" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TabsContent>
        </TabsList>
        <TabsContent value="listings">
          <div className="relative flex">
            <div className="relative grow">
              <div className="tiny:gap-5 four:grid-cols-5 three:grid-cols-4 two:grid-cols-3 tiny:grid-cols-2 mt-4 grid grid-cols-2 gap-2">
                {currentItems.map((item: any, index: any) => (
                  <Card
                    key={index}
                    className={`relative w-56 gap-0! pt-0 pb-0 ${item.activities[item.activities.length - 1]?.state == "listed" && "hover:border-[#8c45ff] hover:[&_div]:[&_button]:bg-[#8c45ff] hover:[&_div]:[&_button]:text-white"} `}
                  >
                    <div className="pointer-events-none absolute top-0 right-0 rounded-tr-[12px] rounded-bl-[12px] bg-[#0000006b] px-2 py-0 text-[0.9rem] font-semibold text-white">
                      {item.name}
                    </div>
                    <Link href={`/inscription/${item.inscriptionId}`}>
                      <Image
                        src={`${ORD_API_BASE}/content/${item.inscriptionId}`}
                        alt={`Inscription #${item.inscriptionId}`}
                        width={224}
                        height={224}
                        className="block aspect-square w-full rounded-[12px] bg-[#00000080] object-contain [image-rendering:pixelated]"
                        unoptimized
                      />
                    </Link>
                    <div className="flex h-full flex-col px-3 pt-1 pb-3">
                      <div className="my-1 flex justify-center gap-4 text-[1.1rem] leading-[1.2] font-semibold text-white">
                        {/* <span>{selectedCollection.name}</span> */}
                        <span>{item.name}</span>
                      </div>
                      {item.activities[item.activities.length - 1]?.state ==
                      "listed" ? (
                        <div className="mt-auto border-t border-white/10 py-1">
                          <div className="flex justify-center text-center">
                            <Image
                              src="/assets/coin.gif"
                              alt="coin"
                              width={18}
                              height={18}
                              priority
                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                            />
                            {
                              item.activities[item.activities.length - 1]
                                .priceSats
                            }
                            &#xA0;
                            <span className="text-[0.9rem] text-[#fffc]">
                              ($
                              {(
                                item.activities[item.activities.length - 1]
                                  .priceSats * pepecoinPrice
                              ).toFixed(2)}
                              )
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto h-1"></div>
                      )}
                      {item.activities[item.activities.length - 1]?.state ==
                      "listed" ? (
                        <Dialog>
                          <DialogTrigger className="font-inherit w-full cursor-pointer rounded-[12px] border-0 bg-[#e6d8fe] px-4 py-2 text-[1em] font-extrabold text-[#9c63fa] transition-all duration-250 ease-in-out">
                            Buy
                          </DialogTrigger>
                          <DialogContent className="my-[50px] box-border flex min-h-[500px] w-xl max-w-[calc(100%-1rem)] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                            <DialogHeader>
                              <DialogTitle className="mt-0 mb-2 text-center text-3xl leading-[1.1] font-semibold text-[#e6d8fe]">
                                Buy {item.name}
                              </DialogTitle>
                              <DialogDescription></DialogDescription>
                              <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
                                <div className="rounded-[12px] bg-[#00000080] p-2">
                                  <div className="flex">
                                    <Image
                                      src={`${ORD_API_BASE}/content/${item.inscriptionId}`}
                                      alt={`Inscription #${item.inscriptionId}`}
                                      width={144}
                                      height={144}
                                      className="mx-auto h-36 w-36 rounded-md text-[0.8rem]"
                                      unoptimized
                                    />
                                  </div>
                                  <div className="mt-2 text-center text-[1rem] text-white">
                                    {selectedCollection.name} {item.name}
                                    {/* <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                                      <Link
                                        href={`/inscription/${item.inscription_id}`}
                                      >
                                        #{item.inscription_number}
                                      </Link>
                                    </div> */}
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
                                  {(
                                    (item.activities[item.activities.length - 1]
                                      .priceSats *
                                      0.8) /
                                    100
                                  ).toFixed(2)}
                                </div>
                                <span className="ml-4 text-right text-[0.9rem] text-[#fffc]">
                                  $
                                  {(
                                    item.activities[item.activities.length - 1]
                                      .priceSats *
                                    0.008 *
                                    pepecoinPrice
                                  ).toFixed(2)}
                                </span>
                                <div className="text-[0.95rem] text-white">
                                  Network fee
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
                                  ≈0.1
                                </div>
                                <span className="ml-4 text-right text-[0.9rem] text-[#fffc]">
                                  ${(0.5 * pepecoinPrice).toFixed(2)}
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
                                  {(
                                    item.activities[item.activities.length - 1]
                                      .priceSats *
                                      1.008 +
                                    0.1
                                  ).toFixed(2)}
                                </div>
                                <span className="mt-5 ml-4 text-right text-[0.9rem] font-bold text-[#fffc]">
                                  $
                                  {(
                                    (item.activities[item.activities.length - 1]
                                      .priceSats *
                                      1.008 +
                                      0.1) *
                                    pepecoinPrice
                                  ).toFixed(2)}
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
                                  {balance?.toFixed(2)}
                                </div>
                                <span className="mt-2 ml-4 text-right text-[0.9rem] text-[#fffc]">
                                  $
                                  {(Number(balance) * pepecoinPrice).toFixed(2)}
                                </span>
                              </div>
                              {item.activities[item.activities.length - 1]
                                .priceSats *
                                1.008 +
                                0.1 <=
                              Number(balance) ? (
                                <button
                                  onClick={() => handleBuy(item)}
                                  className="font-inherit mt-4 flex w-full justify-center rounded-[12px] border border-transparent bg-[#8c45ff] px-4 py-2 text-[1em] font-bold text-white transition-all duration-200 ease-in-out"
                                >
                                  Confirm
                                </button>
                              ) : (
                                <button
                                  disabled
                                  className="font-inherit mt-4 flex w-full justify-center rounded-[12px] border border-transparent px-4 py-2 text-[1em] font-bold text-white transition-all duration-200 ease-in-out disabled:bg-[#1a1a1a]"
                                >
                                  Insufficient balance
                                </button>
                              )}
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <button
                          className="font-inherit w-full rounded-lg border-none bg-[#ffffff12] px-4 py-2 text-base font-extrabold text-[#cacaca] transition-all duration-200 ease-in-out"
                          disabled
                        >
                          Not listed
                        </button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            {selectedFilter && (
              <div className="sticky top-[100px] block h-[calc(100vh-200px)] w-[300px] min-w-[300px] overflow-y-auto px-8">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="mb-4">
                    <div className="text-[1.1rem] font-semibold">
                      Background:
                    </div>
                    {[...Array(9)].map((_, i) => (
                      <label
                        key={i}
                        className="relative flex cursor-pointer items-center rounded-[12px] p-3 leading-[1.2] hover:bg-[#222]"
                      >
                        <input
                          type="checkbox"
                          className="m-0 mr-3 h-[18px] w-[18px]"
                        />
                        <span className="font-semibold">Black n tan</span>
                        <span className="ml-auto pl-2 text-[0.9rem] text-[#fffc]">
                          2867
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Pagination className="mt-5">
            <PaginationContent className="flex items-center space-x-2">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  className="rounded-md bg-[#111] text-white transition-all hover:bg-[#1c1c1c]"
                />
              </PaginationItem>

              {(() => {
                const pageButtons: (number | string)[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pageButtons.push(i);
                } else if (currentPage <= 4) {
                  pageButtons.push(1, 2, 3, 4, 5, "...", totalPages);
                } else if (currentPage >= totalPages - 3) {
                  pageButtons.push(
                    1,
                    "...",
                    totalPages - 4,
                    totalPages - 3,
                    totalPages - 2,
                    totalPages - 1,
                    totalPages,
                  );
                } else {
                  pageButtons.push(
                    1,
                    "...",
                    currentPage - 1,
                    currentPage,
                    currentPage + 1,
                    "...",
                    totalPages,
                  );
                }

                return pageButtons.map((page, idx) =>
                  typeof page === "number" ? (
                    <PaginationItem key={idx}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(page);
                        }}
                        isActive={page === currentPage}
                        className={`flex h-[38px] min-w-[38px] items-center justify-center rounded-md border transition-all ${
                          page === currentPage
                            ? "border-yellow-400 bg-[#111] text-yellow-400"
                            : "border-transparent bg-[#111] text-white hover:border-white/20 hover:bg-[#1c1c1c]"
                        }`}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={idx}>
                      <PaginationEllipsis className="text-white/60" />
                    </PaginationItem>
                  ),
                );
              })()}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  className="rounded-md bg-[#111] text-white transition-all hover:bg-[#1c1c1c]"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </TabsContent>
        <TabsContent value="activity">
          <div className="mb-8">
            <FloorPriceChart />
          </div>
        </TabsContent>
      </Tabs>
      {/* <div className="fixed bottom-4 flex w-full justify-center">
        <div className="inline-flex grow-0 items-center rounded-[12px] bg-[#45454580] p-2 backdrop-blur-[20px]">
          <span className="mr-6 ml-4 text-[1.1rem] font-bold">
            Click on items to select
          </span>
          <button className="font-inherit inline-flex shrink-0 cursor-pointer items-center rounded-[12px] border-2 border-white bg-none px-4 py-2 text-[1em] font-medium text-white transition-all duration-200 ease-in-out hover:bg-white hover:text-black">
            <X size={18} />
            <span className="ml-2">Cancel</span>
          </button>
        </div>
      </div> */}
    </>
  );
}
