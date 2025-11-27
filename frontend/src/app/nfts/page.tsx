"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/components/page/PRCTwenty";
import { Collcetions, useOffChainData } from "@/hooks/useOffChainData";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

// Constants
const SKELETON_ROWS = 10;

// Types
interface CollectionItem {
  symbol: string;
  name: string;
  profileInscriptionId: string;
}

interface CollectionStats {
  symbol: string;
  floorPrice?: number;
  volume24h?: number;
  totalVolume?: number;
  trades24h?: number;
  supply?: number;
  owners?: number;
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

// Price Cell Component
function PriceCell({ value }: { value: number | undefined }) {
  return (
    <div className="flex items-center">
      <CoinIcon />
      {value ? formatPrice(value) : "-"}
    </div>
  );
}

// Number Cell Component
function NumberCell({ value }: { value: number | undefined }) {
  return <span>{value !== undefined ? value.toLocaleString() : "-"}</span>;
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
        width={42}
        height={42}
        className="h-[42px] w-[42px] rounded-full object-cover align-middle"
        unoptimized
      />
    </div>
  );
}

// Loading Row Component
function LoadingRow() {
  return (
    <TableRow className="text-[16px]">
      <TableCell className="w-auto rounded-tl-[12px] rounded-bl-[12px] px-3 py-4 align-middle">
        <Skeleton className="h-5 w-6 bg-[#4c505c33]" />
      </TableCell>
      <TableCell>
        <div className="relative mx-[1.4rem] my-0 shrink-0">
          <Skeleton className="h-[42px] w-[42px] rounded-full bg-[#4c505c33]" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-32 bg-[#4c505c33]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 bg-[#4c505c33]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 bg-[#4c505c33]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-20 bg-[#4c505c33]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-12 bg-[#4c505c33]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-12 bg-[#4c505c33]" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-12 bg-[#4c505c33]" />
      </TableCell>
    </TableRow>
  );
}

// Collection Row Component
function CollectionRow({
  item,
  index,
  stats,
  onClick,
}: {
  item: CollectionItem;
  index: number;
  stats: CollectionStats | undefined;
  onClick: () => void;
}) {
  return (
    <TableRow
      className="cursor-pointer text-[16px] text-white transition-all duration-150 ease-in-out hover:bg-[#1D1E20]"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View ${item.name} collection`}
    >
      <TableCell className="w-auto rounded-tl-[12px] rounded-bl-[12px] px-3 py-4 align-middle font-bold">
        {index + 1}
      </TableCell>
      <TableCell>
        <CollectionImage
          inscriptionId={item.profileInscriptionId}
          name={item.name}
        />
      </TableCell>
      <TableCell className="font-medium">{item.name}</TableCell>
      <TableCell>
        <PriceCell value={stats?.floorPrice} />
      </TableCell>
      <TableCell>
        <PriceCell value={stats?.volume24h} />
      </TableCell>
      <TableCell>
        <PriceCell value={stats?.totalVolume} />
      </TableCell>
      <TableCell>
        <NumberCell value={stats?.trades24h} />
      </TableCell>
      <TableCell>
        <NumberCell value={stats?.supply} />
      </TableCell>
      <TableCell>
        <NumberCell value={stats?.owners} />
      </TableCell>
    </TableRow>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={9} className="h-32 text-center">
        <div className="flex flex-col items-center justify-center text-white/70">
          <p>No collections available</p>
          <p className="mt-2 text-sm text-white/50">Check back soon!</p>
        </div>
      </TableCell>
    </TableRow>
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
export default function NFTs() {
  const router = useRouter();

  // Fetch data using useOffChainData
  const { collections, isCollectionsLoading, collectionsError } =
    useOffChainData<Collcetions>({});

  // Memoize collections data
  const collectionsActive = useMemo<CollectionItem[]>(
    () => collections?.collectionsActive ?? [],
    [collections?.collectionsActive],
  );

  const collectionsInfo = useMemo(
    () => (collections?.collectionsInfo ?? []) as CollectionStats[],
    [collections?.collectionsInfo],
  );

  // Create a map for O(1) lookup performance
  const statsMap = useMemo(() => {
    const map = new Map<string, CollectionStats>();
    if (Array.isArray(collectionsInfo)) {
      collectionsInfo.forEach((stat) => {
        if (stat?.symbol) {
          map.set(stat.symbol, stat);
        }
      });
    }
    return map;
  }, [collectionsInfo]);

  // Memoized stats lookup function
  const getCollectionStats = useCallback(
    (symbol: string): CollectionStats | undefined => {
      return statsMap.get(symbol);
    },
    [statsMap],
  );

  // Handle row click
  const handleRowClick = useCallback(
    (symbol: string) => {
      router.push(`/nfts/${symbol}`);
    },
    [router],
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="m-0 text-[1.6rem] leading-[1.1] font-bold text-[#00c853]">
          Collections
        </h1>
      </div>

      {/* Error State */}
      {collectionsError && (
        <ErrorState message="Failed to load collections data. Please try again." />
      )}

      {/* Table */}
      {!collectionsError && (
        <div className="px-2.0 w-full overflow-x-auto">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;</TableHead>
                <TableHead>Collection name</TableHead>
                <TableHead>Floor price</TableHead>
                <TableHead>Volume (24h)</TableHead>
                <TableHead>Total volume</TableHead>
                <TableHead>Trades (24h)</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Owners</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCollectionsLoading ? (
                // Loading State
                Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                  <LoadingRow key={`loading-${index}`} />
                ))
              ) : collectionsActive.length === 0 ? (
                // Empty State
                <EmptyState />
              ) : (
                // Collections List
                collectionsActive.map((item, index) => {
                  const stats = getCollectionStats(item.symbol);
                  const key = `${item.symbol}-${index}`;

                  return (
                    <CollectionRow
                      key={key}
                      item={item}
                      index={index}
                      stats={stats}
                      onClick={() => handleRowClick(item.symbol)}
                    />
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
