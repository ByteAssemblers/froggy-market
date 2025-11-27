"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import PepemapCard from "@/components/PepemapCard";
import { FloorPriceChart } from "@/components/FloorPriceChart";
import { PepemapImage } from "../wallet/[address]/page";
import { formatPrice } from "@/components/page/PRCTwenty";
import { useOffChainData } from "@/hooks/useOffChainData";
import { usePepecoinPrice } from "@/hooks/usePepecoinPrice";

import type {
  Pepemap,
  PepemapInfo,
  PepemapActive,
  PepemapActivity,
} from "@/types/pepemap";

// Constants
const ITEMS_PER_PAGE = 30;
const SKELETON_ITEMS_STATS = 7;
const SKELETON_ITEMS_GRID = 30;

const DEFAULT_INFO: PepemapInfo = {
  floorPrice: 0,
  change24h: 0,
  volume24h: 0,
  totalVolume: 0,
  trades24h: 0,
  listed: 0,
};

// Types
interface StatItemProps {
  value: string | number;
  label: string;
  showCoin?: boolean;
  isLoading?: boolean;
}

// Utility Functions
const formatDateString = (dateValue: string | Date | undefined): string => {
  if (!dateValue) return "";
  if (typeof dateValue === "string") return dateValue;
  return dateValue.toISOString();
};

const safeSlice = (
  str: string | undefined,
  start: number,
  end?: number,
): string => {
  if (!str || typeof str !== "string") return "";
  return str.slice(start, end);
};

// Stat Item Component
function StatItem({
  value,
  label,
  showCoin = false,
  isLoading = false,
}: StatItemProps) {
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
        {showCoin && (
          <Image
            src="/assets/coin.gif"
            alt="Pepecoin"
            width={18}
            height={18}
            priority
            className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
            unoptimized
          />
        )}
        <span className="text-white/95">{value}</span>
      </div>
      <div className="text-[90%] leading-none text-white/75">{label}</div>
    </div>
  );
}

// Stats Grid Component
function StatsGrid({
  info,
  isLoading,
}: {
  info: PepemapInfo;
  isLoading: boolean;
}) {
  const stats = useMemo(
    () => [
      {
        value: info.floorPrice ? formatPrice(info.floorPrice) : "-",
        label: "Floor price",
        showCoin: true,
      },
      {
        value: info.volume24h ? formatPrice(info.volume24h) : "-",
        label: "Volume (24h)",
        showCoin: true,
      },
      {
        value: info.totalVolume ? formatPrice(info.totalVolume) : "-",
        label: "Total volume",
        showCoin: true,
      },
      {
        value: info.trades24h?.toLocaleString() ?? "-",
        label: "Trades (24h)",
        showCoin: false,
      },
      {
        value: "----",
        label: "Owners",
        showCoin: false,
      },
      {
        value: "------",
        label: "Supply",
        showCoin: false,
      },
      {
        value: info.listed?.toLocaleString() ?? "-",
        label: "Listed",
        showCoin: false,
      },
    ],
    [info],
  );

  if (isLoading) {
    return (
      <div className="-ml-12 flex flex-wrap">
        {Array.from({ length: SKELETON_ITEMS_STATS }).map((_, i) => (
          <StatItem key={`stat-skeleton-${i}`} value="" label="" isLoading />
        ))}
      </div>
    );
  }

  return (
    <div
      className="-ml-12 flex flex-wrap"
      role="list"
      aria-label="Collection statistics"
    >
      {stats.map((stat, index) => (
        <div key={`stat-${index}`} role="listitem">
          <StatItem {...stat} />
        </div>
      ))}
    </div>
  );
}

// Loading Grid Component
function LoadingGrid() {
  return (
    <div className="tiny:gap-5 four:grid-cols-5 three:grid-cols-4 two:grid-cols-3 tiny:grid-cols-2 mt-4 grid grid-cols-2 gap-2">
      {Array.from({ length: SKELETON_ITEMS_GRID }).map((_, i) => (
        <Skeleton
          key={`grid-skeleton-${i}`}
          className="h-69 rounded-[12px] bg-[#4c505c33]"
        />
      ))}
    </div>
  );
}

// Loading Table Component
function LoadingTable() {
  return (
    <Table className="w-full max-w-full border-separate border-spacing-0 p-8 leading-[1.2]">
      <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {Array.from({ length: 10 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-[55px] w-[55px] rounded-md bg-[#4c505c33]" />
            </TableCell>

            <TableCell>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24 bg-[#4c505c33]" />
                <Skeleton className="h-3 w-16 bg-[#4c505c33]" />
              </div>
            </TableCell>

            <TableCell>
              <Skeleton className="h-5 w-10 rounded-md bg-[#4c505c33]" />
            </TableCell>

            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full bg-[#4c505c33]" />
                <Skeleton className="h-4 w-20 bg-[#4c505c33]" />
              </div>
            </TableCell>

            <TableCell>
              <Skeleton className="h-4 w-28 bg-[#4c505c33]" />
            </TableCell>

            <TableCell>
              <Skeleton className="h-4 w-28 bg-[#4c505c33]" />
            </TableCell>

            <TableCell>
              <div className="flex flex-col">
                <Skeleton className="h-4 w-20 bg-[#4c505c33]" />
                <Skeleton className="mt-1 h-4 w-16 bg-[#4c505c33]" />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Empty State Component
function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 py-8 text-center">
      <p className="text-white/70">{message}</p>
    </div>
  );
}

// Error State Component
function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
      <p className="text-red-400">
        {message || "Failed to load data. Please try again later."}
      </p>
    </div>
  );
}

// Pagination Logic Component
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
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(i);
      }
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

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, page: number) => {
      e.preventDefault();
      onPageChange(page);
    },
    [onPageChange],
  );

  return (
    <Pagination className="mt-5">
      <PaginationContent className="flex items-center space-x-2">
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => handleClick(e, currentPage - 1)}
            aria-disabled={currentPage === 1}
            className={`rounded-md bg-[#111] text-white transition-all hover:bg-[#1c1c1c] ${
              currentPage === 1 ? "pointer-events-none opacity-50" : ""
            }`}
          />
        </PaginationItem>

        {pageButtons.map((page, idx) =>
          typeof page === "number" ? (
            <PaginationItem key={`page-${idx}`}>
              <PaginationLink
                href="#"
                onClick={(e) => handleClick(e, page)}
                isActive={page === currentPage}
                aria-current={page === currentPage ? "page" : undefined}
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
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis className="text-white/60" />
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => handleClick(e, currentPage + 1)}
            aria-disabled={currentPage === totalPages}
            className={`rounded-md bg-[#111] text-white transition-all hover:bg-[#1c1c1c] ${
              currentPage === totalPages ? "pointer-events-none opacity-50" : ""
            }`}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// Activity Table Component
function ActivityTable({
  activities,
  isLoading,
}: {
  activities: PepemapActivity[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return <LoadingTable />;
  }

  if (activities.length === 0) {
    return <EmptyState message="No recent activity" />;
  }

  return (
    <Table className="w-full max-w-full border-separate border-spacing-0 p-8 leading-[1.2]">
      <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
        <TableRow>
          <TableHead>Item</TableHead>
          <TableHead>Details</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead>Buyer</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((item, index) => {
          const dateStr = formatDateString(item.createdAt);
          const inscriptionId = item.inscriptionId || "";
          const sellerAddress = item.sellerAddress || "";
          const buyerAddress = item.buyerAddress || "";

          // Generate unique key using multiple fields to prevent duplicates
          const uniqueKey = inscriptionId
            ? `${inscriptionId}-${index}`
            : `activity-${index}-${dateStr}-${sellerAddress}`;

          return (
            <TableRow key={uniqueKey}>
              <TableCell>
                <Link
                  href={`/inscription/${inscriptionId}`}
                  aria-label={`View inscription ${inscriptionId}`}
                >
                  <PepemapImage item={item} sm />
                </Link>
              </TableCell>
              <TableCell>
                <div>
                  <span className="leading-[1.1]">
                    {item.pepemapLabel || "-"}
                  </span>
                  <div className="leading-none">
                    <Link
                      href={`/inscription/${inscriptionId}`}
                      className="text-[0.7rem] text-[#dfc0fd] hover:underline"
                      aria-label={`Inscription ID: ${inscriptionId}`}
                    >
                      {safeSlice(inscriptionId, 0, 3)}...
                      {safeSlice(inscriptionId, -3)}
                    </Link>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span
                  className="rounded-[6px] bg-[#00d1814d] px-1 py-0.5 text-[0.8rem] text-[#00d181]"
                  aria-label="Sale transaction"
                >
                  sell
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center">
                  <Image
                    src="/assets/coin.gif"
                    alt="Pepecoin"
                    width={18}
                    height={18}
                    priority
                    className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                    unoptimized
                  />
                  {item.priceSats?.toLocaleString() ?? "-"}
                </div>
              </TableCell>
              <TableCell>
                <Link
                  href={`/wallet/${sellerAddress}`}
                  className="cursor-pointer font-medium text-[#c891ff] decoration-inherit hover:underline"
                  aria-label={`Seller wallet: ${sellerAddress}`}
                >
                  {safeSlice(sellerAddress, 0, 5)}...
                  {safeSlice(sellerAddress, -5)}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/wallet/${buyerAddress}`}
                  className="cursor-pointer font-medium text-[#c891ff] decoration-inherit hover:underline"
                  aria-label={`Buyer wallet: ${buyerAddress}`}
                >
                  {safeSlice(buyerAddress, 0, 5)}...
                  {safeSlice(buyerAddress, -5)}
                </Link>
              </TableCell>
              <TableCell>
                <time dateTime={dateStr}>
                  {safeSlice(dateStr, 0, 10)}
                  <br />
                  {safeSlice(dateStr, 11, 19)}
                </time>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Main Component
export default function Pepemaps() {
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data using useOffChainData
  const { pepemap, isPepemapLoading, pepemapError } = useOffChainData<Pepemap>(
    {},
  );
  const { pepecoinPrice } = usePepecoinPrice();

  // Extract data with defaults
  const listings = useMemo<PepemapActive[]>(
    () => pepemap?.pepemapActive ?? [],
    [pepemap],
  );

  const info = useMemo<PepemapInfo>(
    () => pepemap?.pepemapInfo ?? DEFAULT_INFO,
    [pepemap],
  );

  const activities = useMemo<PepemapActivity[]>(
    () => pepemap?.pepemapActivity ?? [],
    [pepemap],
  );

  const floorPriceData = useMemo(() => pepemap?.pepemapFloorPrice, [pepemap]);

  // Pagination logic
  const { totalPages, currentItems } = useMemo(() => {
    const total = Math.ceil(listings.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const items = listings.slice(startIndex, endIndex);

    return {
      totalPages: total,
      currentItems: items,
    };
  }, [listings, currentPage]);

  // Page change handler
  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [totalPages],
  );

  // Reset to page 1 when switching tabs
  const handleTabChange = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return (
    <div className="container mx-auto px-4">
      {/* Header */}
      <header className="mt-4 mb-8">
        <h1 className="m-0 text-[2.3rem] leading-[1.1] font-bold text-[#00c853]">
          Pepemaps
        </h1>
      </header>

      {/* Stats Section */}
      <section aria-label="Collection statistics" className="mb-8">
        <StatsGrid info={info} isLoading={isPepemapLoading} />
      </section>

      {/* Error State */}
      {pepemapError && (
        <ErrorState message="Failed to load pepemaps data. Please try again." />
      )}

      {/* Tabs Section */}
      {!pepemapError && (
        <Tabs
          defaultValue="listings"
          className="relative"
          onValueChange={handleTabChange}
        >
          <TabsList className="my-4 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
            <div className="my-2 flex list-none gap-5 overflow-x-auto p-0 select-none">
              <TabsTrigger value="listings" className="text-md">
                Listings ({listings.length})
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-md">
                Activity
              </TabsTrigger>
            </div>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings">
            {isPepemapLoading ? (
              <LoadingGrid />
            ) : listings.length === 0 ? (
              <EmptyState message="No pepemaps listed for sale" />
            ) : (
              <>
                <div
                  className="tiny:gap-5 four:grid-cols-5 three:grid-cols-4 two:grid-cols-3 tiny:grid-cols-2 mt-4 grid grid-cols-2 gap-2"
                  role="list"
                  aria-label="Pepemap listings"
                >
                  {currentItems.map((item, index) => {
                    // Use stable key: prefer id, then inscriptionId, finally index
                    const key =
                      item.id ||
                      item.inscriptionId ||
                      `listing-${currentPage}-${index}`;
                    return (
                      <div key={key} role="listitem">
                        <PepemapCard
                          item={item}
                          pepecoinPrice={pepecoinPrice ?? 0}
                        />
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                )}
              </>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <section aria-label="Price chart" className="mb-6">
              <FloorPriceChart
                data={floorPriceData}
                isLoading={isPepemapLoading}
              />
            </section>

            <section aria-label="Recent activity">
              <ActivityTable
                activities={activities}
                isLoading={isPepemapLoading}
              />
            </section>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
