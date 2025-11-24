"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/components/page/PRCTwenty";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

export default function nfts() {
  const router = useRouter();
  const [nfts, setNfts] = useState<any[]>([]);
  const {
    collections,
    isCollectionsLoading,
    collectionsError,
    collectionInfo,
    isCollectionInfoLoading,
  } = useProfile();

  const isLoading = isCollectionsLoading || isCollectionInfoLoading;

  useEffect(() => {
    if (collections && !isCollectionsLoading) {
      setNfts(collections);
    }
  }, [collections, isCollectionsLoading]);

  // Helper function to get collection stats by symbol
  const getCollectionStats = (symbol: string) => {
    if (!collectionInfo || !Array.isArray(collectionInfo)) return null;
    return collectionInfo.find((info: any) => info.symbol === symbol);
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-[1.6rem] leading-[1.1]">Collections</h2>
        <div></div>
        <button></button>
      </div>
      <div className="px-2.0 w-full overflow-x-auto">
        <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
          <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
            <TableRow className="">
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
            {isLoading
              ? [...Array(5)].map((_, index) => (
                  <TableRow key={index} className="text-[16px]">
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
                ))
              : nfts.map((item, index) => {
                  const stats = getCollectionStats(item.symbol);
                  return (
                    <TableRow
                      key={index}
                      className="cursor-pointer text-[16px] text-white transition-all duration-150 ease-in-out"
                      onClick={() => router.push(`/nfts/${item.symbol}`)}
                    >
                      <TableCell className="w-auto rounded-tl-[12px] rounded-bl-[12px] px-3 py-4 align-middle font-bold">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="relative mx-[1.4rem] my-0 shrink-0">
                          <Image
                            src={`${ORD_API_BASE}/content/${item.profileInscriptionId}`}
                            alt={`Inscription #${item.profileInscriptionId}`}
                            width={42}
                            height={42}
                            className="h-[42px] w-[42px] rounded-full object-cover align-middle"
                            unoptimized
                          />
                        </div>
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
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
                          {stats?.floorPrice
                            ? formatPrice(stats.floorPrice)
                            : "-"}
                        </div>
                      </TableCell>
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
                          {stats?.volume24h
                            ? formatPrice(stats.volume24h)
                            : "-"}
                        </div>
                      </TableCell>
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
                          {stats?.totalVolume
                            ? formatPrice(stats.totalVolume)
                            : "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {stats?.trades24h !== undefined
                          ? stats.trades24h.toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {stats?.supply !== undefined
                          ? stats.supply.toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {stats?.owners !== undefined
                          ? stats.owners.toLocaleString()
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
