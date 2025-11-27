"use client";

import { useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "../ui/skeleton";
import { Collcetions, useOffChainData } from "@/hooks/useOffChainData";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

// Constants
const MAX_COLLECTIONS_DISPLAY = 9;
const SKELETON_ITEMS = 10;

// Types
interface CollectionItem {
  symbol: string;
  name: string;
  profileInscriptionId: string;
}

interface CollectionInfo {
  symbol: string;
  floorPrice: number;
  change24h: number;
  volume24h: number;
}

// Utility function to find collection info by symbol
const findCollectionInfo = (
  collectionsInfo: CollectionInfo[] | undefined,
  symbol: string,
): CollectionInfo | undefined => {
  return collectionsInfo?.find((info) => info.symbol === symbol);
};

// Price Change Component
function PriceChange({ change }: { change: number }) {
  if (change === 0) return null;

  const isPositive = change > 0;
  const color = isPositive ? "text-[#00FF7F]" : "text-[#ff6347]";
  const icon = isPositive
    ? "/assets/icons/arrow-up.svg"
    : "/assets/icons/arrow-down.svg";
  const alt = isPositive ? "Price increased" : "Price decreased";
  const displayValue = Math.abs(change).toFixed(2);

  return (
    <span
      className={`flex text-[0.8rem] ${color}`}
      aria-label={`${isPositive ? "Up" : "Down"} ${displayValue}%`}
    >
      <Image
        src={icon}
        width={24}
        height={24}
        alt={alt}
        style={{ marginBottom: "-0.35em" }}
      />
      <span className="pt-1">{displayValue}%</span>
    </span>
  );
}

// Floor Price Display Component
function FloorPrice({
  floorPrice,
  change24h,
}: {
  floorPrice: number | undefined;
  change24h: number | undefined;
}) {
  return (
    <div className="flex text-[0.9rem] leading-[1.2] font-normal text-[#fffc]">
      Floor price:&#xA0;
      <span className="flex items-center font-medium whitespace-nowrap text-[#fffffff2]">
        <Image
          src="/assets/coin.gif"
          alt="Pepecoin"
          width={16}
          height={16}
          priority
          className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
          unoptimized
        />
        {floorPrice?.toLocaleString() ?? "-"}
        {change24h !== undefined && change24h !== 0 && (
          <>
            &#xA0;
            <PriceChange change={change24h} />
          </>
        )}
      </span>
    </div>
  );
}

// Volume Display Component
function VolumeDisplay({ volume }: { volume: number | undefined }) {
  return (
    <div className="ml-auto flex items-center pl-6 whitespace-nowrap">
      <Image
        src="/assets/coin.gif"
        alt="Pepecoin"
        width={18}
        height={18}
        priority
        className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
        unoptimized
      />
      {volume?.toLocaleString() ?? "-"}
    </div>
  );
}

// Collection Image Component
function CollectionImage({
  inscriptionId,
  name,
}: {
  inscriptionId: string;
  name: string;
}) {
  return (
    <div className="relative mx-[1.4rem] my-0 shrink-0">
      <Image
        src={`${ORD_API_BASE}/content/${inscriptionId}`}
        alt={name}
        width={64}
        height={64}
        className="image-pixelated h-16 w-16 rounded-full bg-[#212121] object-cover"
        unoptimized
      />
    </div>
  );
}

// Loading Skeleton Component
function CollectionSkeleton({ index }: { index: number }) {
  return (
    <div className="mb-1 flex h-22 grow items-center rounded-[12px] bg-transparent px-4 py-3 text-white transition-all duration-150 ease-in-out">
      <div className="min-w-[0.7rem] text-[1.2rem] font-bold">
        <Skeleton className="h-4 w-4 rounded-full bg-[#4c505c33]" />
      </div>
      <div className="relative mx-[1.4rem] my-0 shrink-0">
        <Skeleton className="h-16 w-16 rounded-full bg-[#4c505c33]" />
      </div>
      <div className="flex-1">
        <Skeleton className="mb-1 h-5 w-32 bg-[#4c505c33]" />
        <Skeleton className="h-4 w-24 bg-[#4c505c33]" />
      </div>
      <Skeleton className="ml-auto h-4 w-20 bg-[#4c505c33]" />
    </div>
  );
}

// Collection Card Component
function CollectionCard({
  item,
  index,
  info,
}: {
  item: CollectionItem;
  index: number;
  info: CollectionInfo | undefined;
}) {
  return (
    <Link
      href={`/nfts/${item.symbol}`}
      className="flex grow items-center rounded-[12px] px-4 py-3 text-white transition-all duration-150 ease-in-out hover:bg-[#1D1E20]"
      aria-label={`View ${item.name} collection`}
    >
      {/* Rank */}
      <div
        className="min-w-[0.7rem] text-[1.2rem] font-bold"
        aria-label={`Rank ${index + 1}`}
      >
        {index + 1}
      </div>

      {/* Collection Image */}
      <CollectionImage
        inscriptionId={item.profileInscriptionId}
        name={item.name}
      />

      {/* Collection Info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 max-w-[18rem] truncate text-[1.2rem] leading-[1.2] font-semibold">
          {item.name}
        </div>
        <FloorPrice floorPrice={info?.floorPrice} change24h={info?.change24h} />
      </div>

      {/* Volume */}
      <VolumeDisplay volume={info?.volume24h} />
    </Link>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 py-8 text-center">
      <p className="text-white/70">No collections available at the moment.</p>
      <p className="mt-2 text-sm text-white/50">Check back soon!</p>
    </div>
  );
}

// Error State Component
function ErrorState({ message }: { message?: string }) {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
      <p className="text-red-400">
        {message || "Failed to load collections. Please try again later."}
      </p>
    </div>
  );
}

// Main Component
export default function Collections() {
  // Fetch data using useOffChainData
  const { collections, isCollectionsLoading, collectionsError } =
    useOffChainData<Collcetions>({});

  // Memoize collections data
  const collectionsActive = useMemo<CollectionItem[]>(
    () => collections?.collectionsActive ?? [],
    [collections?.collectionsActive],
  );

  const collectionsInfo = useMemo(
    () => collections?.collectionsInfo ?? [],
    [collections?.collectionsInfo],
  ) as CollectionInfo[];

  // Memoize displayed collections (first 9)
  const displayedCollections = useMemo(
    () => collectionsActive.slice(0, MAX_COLLECTIONS_DISPLAY),
    [collectionsActive],
  );

  // Memoize collection info lookup function
  const getCollectionInfo = useCallback(
    (symbol: string) => findCollectionInfo(collectionsInfo, symbol),
    [collectionsInfo],
  );

  return (
    <section aria-labelledby="collections-heading">
      {/* Header */}
      <h2
        id="collections-heading"
        className="mt-8 mb-6 text-[1.6rem] leading-[1.1] font-bold text-[#00c853]"
      >
        Collections
      </h2>

      {/* Error State */}
      {collectionsError && (
        <ErrorState message="Failed to load collections data. Please try again." />
      )}

      {/* Collections Grid */}
      {!collectionsError && (
        <div
          className="col:grid col:grid-flow-col col:grid-rows-5 gap-x-4"
          role="list"
        >
          {/* Loading State */}
          {isCollectionsLoading ? (
            Array.from({ length: SKELETON_ITEMS }).map((_, i) => (
              <CollectionSkeleton key={`skeleton-${i}`} index={i} />
            ))
          ) : displayedCollections.length === 0 ? (
            /* Empty State */
            <EmptyState />
          ) : (
            /* Collections List */
            <>
              {displayedCollections.map((item, index) => {
                const info = getCollectionInfo(item.symbol);
                const key = `${item.symbol}-${index}`;

                return (
                  <div key={key} role="listitem">
                    <CollectionCard item={item} index={index} info={info} />
                  </div>
                );
              })}

              {/* Show All Link */}
              <Link
                href="/nfts"
                className="flex items-center justify-center rounded-[12px] px-4 py-3 font-bold text-[#fbb9fb] transition-all duration-150 ease-in-out hover:bg-[#1D1E20] hover:text-[violet]"
                aria-label="View all collections"
              >
                <div className="flex h-16 items-center">
                  Show all collections
                </div>
              </Link>
            </>
          )}
        </div>
      )}
    </section>
  );
}
