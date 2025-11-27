"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { apiClient } from "@/lib/axios";
import { completeBuyPSBT } from "@/lib/marketplace/psbt";
import { getPepecoinBalance } from "@/lib/wallet/getBalance";
import { formatPrice } from "@/components/page/PRCTwenty";
import { useOffChainData } from "@/hooks/useOffChainData";
import { usePepecoinPrice } from "@/hooks/usePepecoinPrice";
import { useProfile } from "@/hooks/useProfile";
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
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  BrushCleaning,
  Check,
  EllipsisVertical,
  Filter,
  ShoppingCart,
} from "lucide-react";
import { FloorPriceChart } from "@/components/FloorPriceChart";
import type { CollectionActive, Inscription } from "@/types/collections";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

// Constants
const ITEMS_PER_PAGE = 30;
const SKELETON_STATS = 7;
const SORT_OPTIONS = [
  "Price: lowest first",
  "Price: highest first",
  "Recently listed",
  "Inscription number: lowest first",
];

// Types
interface CollectionStats {
  floorPrice?: number;
  volume24h?: number;
  totalVolume?: number;
  trades24h?: number;
  owners?: number;
  supply?: number;
  listed?: number;
}

// Coin Icon Component
function CoinIcon() {
  return (
    <Image
      src="/assets/coin.gif"
      alt="Pepecoin"
      width={18}
      height={18}
      priority
      className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
      unoptimized
    />
  );
}

// Stat Item Component
function StatItem({
  value,
  label,
  showCoin = false,
  isLoading = false,
}: {
  value: string | number;
  label: string;
  showCoin?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="mb-2 ml-12">
        <Skeleton className="mb-1 h-6 w-20 bg-[#4c505c33]" />
        <Skeleton className="h-4 w-16 bg-[#4c505c33]" />
      </div>
    );
  }

  return (
    <div className="mb-2 ml-12">
      <div className={`font-bold ${showCoin ? "flex" : ""}`}>
        {showCoin && <CoinIcon />}
        <span className="text-white/95">{value}</span>
      </div>
      <div className="text-[90%] leading-none text-white/75">{label}</div>
    </div>
  );
}

// Collection Header Component
function CollectionHeader({ collection }: { collection: CollectionActive }) {
  return (
    <div className="mt-4 mb-8 flex items-center">
      <Image
        src={`${ORD_API_BASE}/content/${collection.profileInscriptionId}`}
        alt={collection.name}
        width={112}
        height={112}
        className="mr-6 h-28 w-28 shrink-0 rounded-full object-cover [image-rendering:pixelated]"
        unoptimized
      />
      <div>
        <div className="flex flex-wrap items-center gap-x-12 gap-y-2">
          <div className="flex items-center gap-x-4">
            <h1 className="m-0 text-[2.3rem] leading-[1.1] text-[#00c853]">
              {collection.name}
            </h1>
            <Image
              src="/assets/icons/badge.svg"
              width={24}
              height={24}
              alt="Verified"
            />
          </div>
          <div className="flex">
            <Link
              href={collection.socialLink}
              className="mr-4 leading-none text-[#fffc]"
            >
              <Image
                src="/assets/icons/globe.svg"
                width={24}
                height={24}
                alt="Website"
              />
            </Link>
            {collection.personalLink && (
              <Link
                href={collection.personalLink}
                className="leading-none text-[#fffc]"
              >
                <Image
                  src="/assets/icons/x-logo.svg"
                  width={24}
                  height={24}
                  alt="X"
                />
              </Link>
            )}
          </div>
        </div>
        <div className="mt-2 leading-tight text-white/95">
          {collection.description}
        </div>
      </div>
    </div>
  );
}

// Stats Grid Component
function StatsGrid({
  stats,
  isLoading,
}: {
  stats: CollectionStats;
  isLoading: boolean;
}) {
  const statsData = useMemo(
    () => [
      {
        value: stats.floorPrice ? formatPrice(stats.floorPrice) : "-",
        label: "Floor price",
        showCoin: true,
      },
      {
        value: stats.volume24h ? formatPrice(stats.volume24h) : "-",
        label: "Volume (24h)",
        showCoin: true,
      },
      {
        value: stats.totalVolume ? formatPrice(stats.totalVolume) : "-",
        label: "Total volume",
        showCoin: true,
      },
      {
        value: stats.trades24h?.toLocaleString() ?? "-",
        label: "Trades (24h)",
        showCoin: false,
      },
      {
        value: stats.owners?.toLocaleString() ?? "-",
        label: "Owners",
        showCoin: false,
      },
      {
        value: stats.supply?.toLocaleString() ?? "-",
        label: "Supply",
        showCoin: false,
      },
      {
        value: stats.listed?.toLocaleString() ?? "-",
        label: "Listed",
        showCoin: false,
      },
    ],
    [stats],
  );

  if (isLoading) {
    return (
      <div className="-ml-12 flex flex-wrap">
        {Array.from({ length: SKELETON_STATS }).map((_, i) => (
          <StatItem key={`stat-skeleton-${i}`} value="" label="" isLoading />
        ))}
      </div>
    );
  }

  return (
    <div className="-ml-12 flex flex-wrap">
      {statsData.map((stat, index) => (
        <StatItem key={`stat-${index}`} {...stat} />
      ))}
    </div>
  );
}

// NFT Card Component
function NFTCard({
  item,
  collection,
  pepecoinPrice,
  onBuy,
}: {
  item: Inscription;
  collection: CollectionActive;
  pepecoinPrice: number;
  onBuy: (item: Inscription) => void;
}) {
  const latestActivity = item.activities?.[item.activities.length - 1];
  const isListed = latestActivity?.state === "listed";
  const price = latestActivity?.priceSats ?? 0;

  return (
    <Card
      className={`relative w-56 gap-0! pt-0 pb-0 ${
        isListed &&
        "hover:border-[#8c45ff] hover:[&_div]:[&_button]:bg-[#8c45ff] hover:[&_div]:[&_button]:text-white"
      }`}
    >
      <div className="pointer-events-none absolute top-0 right-0 rounded-tr-[12px] rounded-bl-[12px] bg-[#0000006b] px-2 py-0 text-[0.9rem] font-semibold text-white">
        {item.name}
      </div>
      <Link href={`/inscription/${item.inscriptionId}`}>
        <Image
          src={`${ORD_API_BASE}/content/${item.inscriptionId}`}
          alt={item.name}
          width={224}
          height={224}
          className="block aspect-square w-full rounded-[12px] bg-[#00000080] object-contain [image-rendering:pixelated]"
          unoptimized
        />
      </Link>
      <div className="flex h-full flex-col px-3 pt-1 pb-3">
        <div className="my-1 flex justify-center gap-4 text-[1.1rem] leading-[1.2] font-semibold text-white">
          <span>{item.name}</span>
        </div>
        {isListed ? (
          <div className="mt-auto border-t border-white/10 py-1">
            <div className="flex justify-center text-center">
              <CoinIcon />
              {price}
              &#xA0;
              <span className="text-[0.9rem] text-[#fffc]">
                (${(price * pepecoinPrice).toFixed(2)})
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-auto h-1"></div>
        )}
        {isListed ? (
          <BuyDialog
            item={item}
            collection={collection}
            pepecoinPrice={pepecoinPrice}
            onBuy={onBuy}
          />
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
  );
}

// Buy Dialog Component
function BuyDialog({
  item,
  collection,
  pepecoinPrice,
  onBuy,
}: {
  item: Inscription;
  collection: CollectionActive;
  pepecoinPrice: number;
  onBuy: (item: Inscription) => void;
}) {
  const { walletAddress } = useProfile();
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const price = item.activities?.[item.activities.length - 1]?.priceSats ?? 0;
  const fee = (price * 0.008).toFixed(2);
  const networkFee = 0.1;
  const total = (price * 1.008 + networkFee).toFixed(2);

  useEffect(() => {
    async function fetchBalance() {
      if (!walletAddress) return;
      setLoadingBalance(true);
      const bal = await getPepecoinBalance(walletAddress);
      setBalance(bal);
      setLoadingBalance(false);
    }
    fetchBalance();
  }, [walletAddress]);

  const canBuy = balance !== null && Number(total) <= balance;

  return (
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
                  alt={item.name}
                  width={144}
                  height={144}
                  className="mx-auto h-36 w-36 rounded-md text-[0.8rem]"
                  unoptimized
                />
              </div>
              <div className="mt-2 text-center text-[1rem] text-white">
                {collection.name} {item.name}
              </div>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-[1fr_auto_auto] leading-[1.6]">
            <div className="text-[0.95rem] text-white">Taker fee (2.8%)</div>
            <div className="flex text-[1rem] text-white">
              <CoinIcon />
              {fee}
            </div>
            <span className="ml-4 text-right text-[0.9rem] text-[#fffc]">
              ${(Number(fee) * pepecoinPrice).toFixed(2)}
            </span>

            <div className="text-[0.95rem] text-white">Network fee</div>
            <div className="flex text-[1rem] text-white">
              <CoinIcon />≈{networkFee}
            </div>
            <span className="ml-4 text-right text-[0.9rem] text-[#fffc]">
              ${(networkFee * pepecoinPrice).toFixed(2)}
            </span>

            <div className="mt-5 text-[1rem] font-bold text-white">Total</div>
            <div className="mt-5 flex text-[1rem] font-bold text-white">
              <CoinIcon />
              {total}
            </div>
            <span className="mt-5 ml-4 text-right text-[0.9rem] font-bold text-[#fffc]">
              ${(Number(total) * pepecoinPrice).toFixed(2)}
            </span>

            <div className="mt-2 text-[0.95rem] text-white">
              Available balance
            </div>
            <div className="mt-2 flex text-[1rem] text-white">
              <CoinIcon />
              {loadingBalance ? "..." : balance?.toFixed(2)}
            </div>
            <span className="mt-2 ml-4 text-right text-[0.9rem] text-[#fffc]">
              ${((balance || 0) * pepecoinPrice).toFixed(2)}
            </span>
          </div>
          {canBuy ? (
            <button
              onClick={() => onBuy(item)}
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
  );
}

// Activity Table Component
function ActivityTable({
  activities,
  isLoading,
}: {
  activities: any[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="py-8 text-center text-white/70">No activity yet</div>
    );
  }

  return (
    <Table className="w-full max-w-full border-separate border-spacing-0 p-8 leading-[1.2]">
      <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((item: any, index: number) => (
          <TableRow key={`activity-${index}`}>
            <TableCell>
              <div className="flex items-center gap-x-[1.2rem]">
                <Link href={`/inscription/${item.inscription.inscriptionId}`}>
                  <Image
                    src={`${ORD_API_BASE}/content/${item.inscription.inscriptionId}`}
                    alt={item.inscription.name}
                    width={32}
                    height={32}
                    className="h-12 w-12 shrink-0 rounded-xl object-cover [image-rendering:pixelated]"
                    unoptimized
                  />
                </Link>
                <div>
                  <span className="leading-[1.1]">{item.inscription.name}</span>
                  <div className="leading-none">
                    <Link
                      href={`/inscription/${item.inscription.inscriptionId}`}
                      className="text-[0.7rem] text-[#dfc0fd]"
                    >
                      {item.inscription.inscriptionId.slice(0, 3)}...
                      {item.inscription.inscriptionId.slice(-3)}
                    </Link>
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <span className="rounded-[6px] bg-[#00d1814d] px-1 py-0.5 text-[0.8rem] text-[#00d181]">
                sell
              </span>
            </TableCell>
            <TableCell>
              <div className="flex">
                <CoinIcon />
                {item.priceSats}
              </div>
            </TableCell>
            <TableCell>
              <Link
                href={`/wallet/${item.sellerAddress}`}
                className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
              >
                {item.sellerAddress.slice(0, 5)}...
                {item.sellerAddress.slice(-5)}
              </Link>
            </TableCell>
            <TableCell>
              <Link
                href={`/wallet/${item.buyerAddress}`}
                className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
              >
                {item.buyerAddress.slice(0, 5)}...{item.buyerAddress.slice(-5)}
              </Link>
            </TableCell>
            <TableCell>
              {item.createdAt.slice(0, 10)}
              <br />
              {item.createdAt.slice(11, 19)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Pagination Component
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pageButtons = useMemo(() => {
    const buttons: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) buttons.push(i);
    } else if (currentPage <= 4) {
      buttons.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      buttons.push(
        1,
        "...",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      );
    } else {
      buttons.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    }
    return buttons;
  }, [currentPage, totalPages]);

  return (
    <Pagination className="mt-5">
      <PaginationContent className="flex items-center space-x-2">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(currentPage - 1);
            }}
            className="rounded-md bg-[#111] text-white transition-all hover:bg-[#1c1c1c]"
          />
        </PaginationItem>
        {pageButtons.map((page, idx) =>
          typeof page === "number" ? (
            <PaginationItem key={idx}>
              <PaginationLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(page);
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
        )}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(currentPage + 1);
            }}
            className="rounded-md bg-[#111] text-white transition-all hover:bg-[#1c1c1c]"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// Collection Skeleton
function CollectionSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mt-4 mb-8 flex items-center">
        <Skeleton className="h-28 w-28 rounded-full bg-[#4c505c33]" />
        <div className="ml-6 w-full space-y-4">
          <Skeleton className="h-8 w-64 bg-[#4c505c33]" />
          <Skeleton className="h-5 w-96 bg-[#4c505c33]" />
        </div>
      </div>

      {/* Stats skeleton (7 items) */}
      <div className="-ml-12 flex flex-wrap">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="mb-2 ml-12">
            <Skeleton className="mb-1 h-6 w-20 bg-[#4c505c33]" />
            <Skeleton className="h-4 w-16 bg-[#4c505c33]" />
          </div>
        ))}
      </div>

      {/* NFT grid skeleton */}
      <div className="tiny:grid-cols-2 two:grid-cols-3 three:grid-cols-4 four:grid-cols-5 mt-6 grid gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Card key={i} className="border-none bg-transparent p-0">
            <Skeleton className="h-48 w-full rounded-md bg-[#4c505c33]" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-5 w-24 bg-[#4c505c33]" />
              <Skeleton className="h-5 w-16 bg-[#4c505c33]" />
              <Skeleton className="h-9 w-full rounded-lg bg-[#4c505c33]" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Main Component
export default function NftPage({
  params,
}: {
  params: Promise<{ nft: string }>;
}) {
  const { nft } = use(params);
  const queryClient = useQueryClient();
  const { walletAddress, privateKey } = useProfile();
  const { pepecoinPrice } = usePepecoinPrice();

  const [selectedSort, setSelectedSort] = useState("Price: lowest first");
  const [selectedFilter, setSelectedFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch collection data
  const { collection, isCollectionLoading, collectionError } = useOffChainData({
    collectionId: nft,
  });

  // Memoize collection data
  const collectionData = useMemo<CollectionActive | null>(() => {
    if (!collection?.collectionActive) return null;
    return collection.collectionActive;
  }, [collection]);

  const stats = useMemo<CollectionStats>(() => {
    if (!collection?.collectionInfo) return {};
    return collection.collectionInfo;
  }, [collection]);

  const floorPriceData = useMemo(() => {
    return collection?.collectionFloorPrice ?? undefined;
  }, [collection]);

  const activityData = useMemo(() => {
    return collection?.collectionActivity ?? [];
  }, [collection]);

  // Filter listed items
  const listedItems = useMemo(() => {
    return (
      collectionData?.inscriptions?.filter(
        (item: Inscription) => item.activities?.length > 0,
      ) || []
    );
  }, [collectionData]);

  // Pagination
  const { totalPages, currentItems } = useMemo(() => {
    const total = Math.ceil(listedItems.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return {
      totalPages: total,
      currentItems: listedItems.slice(startIndex, endIndex),
    };
  }, [listedItems, currentPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages],
  );

  const handleBuy = useCallback(
    async (item: Inscription) => {
      if (!walletAddress) {
        toast.warning("Please connect your wallet first");
        return;
      }

      if (!privateKey) {
        toast.warning("Wallet not connected. Please unlock your wallet.");
        return;
      }

      try {
        const priceSats: number =
          item.activities?.[item.activities.length - 1]?.priceSats ?? 0;
        const listingResponse = await apiClient.get(
          `/listings/inscription/${item.inscriptionId}`,
        );

        if (!listingResponse.data.listing?.psbtBase64) {
          throw new Error("Listing PSBT not found");
        }

        const txid = await completeBuyPSBT(
          listingResponse.data.listing.psbtBase64,
          privateKey,
          walletAddress,
          priceSats,
        );

        await apiClient.post("/listings/buy", {
          inscriptionId: item.inscriptionId,
          buyerAddress: walletAddress,
          priceSats,
          txid,
        });

        toast.success(`NFT purchased successfully! Transaction: ${txid}`);
        await queryClient.invalidateQueries({
          queryKey: ["walletNft", walletAddress],
        });
      } catch (error: any) {
        console.error(error);
        toast.error(
          `Failed to buy NFT: ${error.response?.data?.message || error.message}`,
        );
      }
    },
    [walletAddress, privateKey, queryClient],
  );

  if (!collectionData) {
    return <CollectionSkeleton />;
  }

  return (
    <>
      <CollectionHeader collection={collectionData} />
      <div className="mb-8">
        <StatsGrid stats={stats} isLoading={isCollectionLoading} />
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
                className={`mr-2 cursor-pointer rounded-md p-[0.3rem] hover:bg-[#222] ${
                  selectedFilter
                    ? "bg-[#431e80] text-[#a974ff]"
                    : "bg-transparent text-white"
                }`}
                onClick={() => setSelectedFilter(!selectedFilter)}
              >
                <Filter />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="cursor-pointer rounded-md p-[0.3rem] hover:bg-[#222]">
                  <EllipsisVertical />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="text-lg">
                  {SORT_OPTIONS.map((option) => (
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
                {currentItems.map((item, index) => (
                  <NFTCard
                    key={`${item.inscriptionId}-${index}`}
                    item={item}
                    collection={collectionData}
                    pepecoinPrice={pepecoinPrice ?? 0}
                    onBuy={handleBuy}
                  />
                ))}
              </div>
            </div>
            {selectedFilter && (
              <div className="sticky top-[100px] block h-[calc(100vh-200px)] w-[300px] min-w-[300px] overflow-y-auto px-8">
                <div className="text-white/70">Filters coming soon...</div>
              </div>
            )}
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <FloorPriceChart
            data={floorPriceData}
            isLoading={isCollectionLoading}
          />
          <ActivityTable
            activities={activityData}
            isLoading={isCollectionLoading}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}
