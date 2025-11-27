"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import PepemapCard from "@/components/PepemapCard";
import { Skeleton } from "../ui/skeleton";
import { Pepemap, useOffChainData } from "@/hooks/useOffChainData";
import { usePepecoinPrice } from "@/hooks/usePepecoinPrice";

import type {
  PepemapInfo,
  PepemapActive,
  PepemapActivity,
} from "@/types/pepemap";

type PepemapItem = PepemapActive | PepemapActivity;

interface Breakpoint {
  width: number;
  size: number;
}

const BREAKPOINTS: readonly Breakpoint[] = [
  { width: 1112, size: 4 },
  { width: 900, size: 3 },
  { width: 678, size: 5 },
  { width: 0, size: 3 },
] as const;

const DEFAULT_INFO: PepemapInfo = {
  floorPrice: 0,
  change24h: 0,
  volume24h: 0,
  totalVolume: 0,
  trades24h: 0,
  listed: 0,
};

// Error Boundary Component
function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
      <p className="text-red-400">
        {message || "Failed to load pepemaps. Please try again later."}
      </p>
    </div>
  );
}

// Loading Skeleton Component
function LoadingGrid({ columns }: { columns: number }) {
  return (
    <div className="tiny:gap-5 four:grid-cols-5 three:grid-cols-4 two:grid-cols-3 tiny:grid-cols-2 mt-4 grid grid-cols-2 gap-2">
      {Array.from({ length: columns + 1 }).map((_, i) => (
        <Skeleton
          key={`skeleton-${i}`}
          className="h-69 rounded-[12px] bg-[#4c505c33]"
        />
      ))}
    </div>
  );
}

// Floor Price Display Component
function FloorPrice({ floor, change }: { floor: number; change: number }) {
  const changeColor = change > 0 ? "text-[#00FF7F]" : "text-[#ff6347]";
  const arrowIcon =
    change > 0 ? "/assets/icons/arrow-up.svg" : "/assets/icons/arrow-down.svg";
  const arrowAlt = change > 0 ? "Price increased" : "Price decreased";

  return (
    <div className="flex items-center">
      <span className="text-white/70">Floor price:&nbsp;</span>
      <Image
        src="/assets/coin.gif"
        alt="Pepecoin"
        width={18}
        height={18}
        priority
        className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
        unoptimized
      />
      <span className="flex items-center text-white/95">
        {floor.toLocaleString()}

        {change !== 0 && (
          <span
            className={`ml-2 flex items-center text-[0.8rem] ${changeColor}`}
            aria-label={`${change > 0 ? "Increased" : "Decreased"} by ${Math.abs(change).toFixed(2)}%`}
          >
            <Image
              src={arrowIcon}
              width={24}
              height={24}
              alt={arrowAlt}
              className="mr-1"
            />
            <span>{Math.abs(change).toFixed(2)}%</span>
          </span>
        )}
      </span>
    </div>
  );
}

// Utility function to get columns based on window width
function getColumnsForWidth(width: number): number {
  const breakpoint = BREAKPOINTS.find((bp) => width >= bp.width);
  return breakpoint?.size ?? BREAKPOINTS[BREAKPOINTS.length - 1].size;
}

// Main Component
export default function Pepemaps() {
  const { pepecoinPrice } = usePepecoinPrice();
  const { pepemap, isPepemapLoading, pepemapError } = useOffChainData<Pepemap>(
    {},
  );

  const [visibleItems, setVisibleItems] = useState<PepemapItem[]>([]);
  const [columns, setColumns] = useState(3);

  // Memoize derived data
  const { listing, info } = useMemo(
    () => ({
      listing: pepemap?.pepemapActive ?? [],
      info: pepemap?.pepemapInfo ?? DEFAULT_INFO,
    }),
    [pepemap],
  );

  const { floorPrice, change24h } = info;

  // Update visible items based on window width
  const updateVisibleItems = useCallback(() => {
    if (typeof window === "undefined") return;

    const width = window.innerWidth;
    const newColumns = getColumnsForWidth(width);

    setColumns(newColumns);
    setVisibleItems(listing.slice(0, newColumns));
  }, [listing]);

  // Handle window resize with immediate response
  useEffect(() => {
    updateVisibleItems();

    let rafId: number | null = null;

    const handleResize = () => {
      // Cancel any pending animation frame
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      // Schedule update for next animation frame (immediate but optimized)
      rafId = requestAnimationFrame(() => {
        updateVisibleItems();
        rafId = null;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [updateVisibleItems]);

  // Loading state
  if (isPepemapLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[1.6rem] leading-[1.1] font-bold text-[#00c853]">
              Pepemaps
            </h2>
          </div>
        </div>
        <LoadingGrid columns={columns} />
      </div>
    );
  }

  // Error state
  if (pepemapError) {
    return (
      <div className="space-y-4">
        <h2 className="text-[1.6rem] leading-[1.1] font-bold text-[#00c853]">
          Pepemaps
        </h2>
        <ErrorState message="Unable to load pepemaps data. Please try again." />
      </div>
    );
  }

  // Empty state
  if (listing.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-[1.6rem] leading-[1.1] font-bold text-[#00c853]">
          Pepemaps
        </h2>
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/70">No pepemaps listed at the moment.</p>
          <p className="mt-2 text-sm text-white/50">Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="pepemaps-heading" className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            id="pepemaps-heading"
            className="mt-0 mb-0 text-[1.6rem] leading-[1.1] font-bold text-[#00c853]"
          >
            Pepemaps
          </h2>
          <FloorPrice floor={floorPrice} change={change24h} />
        </div>
      </div>

      {/* Grid */}
      <div
        className="tiny:gap-5 four:grid-cols-5 three:grid-cols-4 two:grid-cols-3 tiny:grid-cols-2 mt-4 grid grid-cols-2 gap-2"
        role="list"
      >
        {visibleItems.map((item) => {
          const key = item.id || item.inscriptionId || crypto.randomUUID();
          return (
            <div key={key} role="listitem">
              <PepemapCard item={item} pepecoinPrice={pepecoinPrice ?? 0} />
            </div>
          );
        })}

        {/* View All Link */}
        <Link
          href="/pepemaps"
          className="focus:ring-violet flex min-h-56 items-center justify-center rounded-[12px] border border-transparent bg-[#4c505c33] font-bold text-[#fbb9fb] transition-all duration-250 ease-in-out hover:border-[violet] hover:text-[violet]"
          aria-label="View all listed pepemaps"
        >
          <div className="p-3 text-center">Show all listed pepemaps</div>
        </Link>
      </div>
    </section>
  );
}
