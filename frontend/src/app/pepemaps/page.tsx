"use client";

import Image from "next/image";
import { useState } from "react";
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
import { Filter } from "lucide-react";
import PepemapCard from "@/components/PepemapCard";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/components/page/PRCTwenty";

export default function Pepemaps() {
  const {
    pepecoinPrice,
    pepemaps,
    isPepemapsLoading,
    pepemapInfo,
    isPepemapInfoLoading,
  } = useProfile();
  const listings = pepemaps || [];
  const isLoading = isPepemapsLoading || isPepemapInfoLoading;

  const ITEMS_PER_PAGE = 30;
  const totalPages = Math.ceil(listings.length / ITEMS_PER_PAGE);

  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = listings.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  return (
    <>
      <div className="mt-4 mb-8 flex items-center">
        <h1 className="m-0 text-[2.3rem] leading-[1.1]">Pepemaps</h1>
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
                  {pepemapInfo?.floorPrice
                    ? formatPrice(pepemapInfo.floorPrice)
                    : "-"}
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
                  {pepemapInfo?.volume24h
                    ? formatPrice(pepemapInfo.volume24h)
                    : "-"}
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
                  {pepemapInfo?.totalVolume
                    ? formatPrice(pepemapInfo.totalVolume)
                    : "-"}
                </span>
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Total volume
              </div>
            </div>
            <div className="mb-2 ml-12">
              <div className="font-bold">
                {pepemapInfo?.trades24h !== undefined
                  ? pepemapInfo.trades24h.toLocaleString()
                  : "-"}
              </div>
              <div className="text-[90%] leading-none text-white/75">
                Trades (24h)
              </div>
            </div>
            <div className="mb-2 ml-12">
              <div className="font-bold">----</div>
              <div className="text-[90%] leading-none text-white/75">Owners</div>
            </div>
            <div className="mb-2 ml-12">
              <div className="font-bold">------</div>
              <div className="text-[90%] leading-none text-white/75">Supply</div>
            </div>
            <div className="mb-2 ml-12">
              <div className="font-bold">
                {pepemapInfo?.listed !== undefined
                  ? pepemapInfo.listed.toLocaleString()
                  : "-"}
              </div>
              <div className="text-[90%] leading-none text-white/75">Listed</div>
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
            <TabsTrigger value="packs" className="text-md">
              Packs
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-md">
              Activity
            </TabsTrigger>
          </div>
          <TabsContent value="listings">
            <div className="absolute right-0 flex gap-2 text-center text-white">
              <Filter />
              <Filter />
              <Filter />
              <Filter />
            </div>
          </TabsContent>
        </TabsList>
        <TabsContent value="listings">
          {isLoading ? (
            <div className="tiny:gap-5 four:grid-cols-5 three:grid-cols-4 two:grid-cols-3 tiny:grid-cols-2 mt-4 grid grid-cols-2 gap-2">
              {[...Array(30)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-69 rounded-[12px] bg-[#4c505c33]"
                />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="py-8 text-center text-white">
              No pepemaps listed for sale
            </div>
          ) : (
            <>
              <div className="tiny:gap-5 four:grid-cols-5 three:grid-cols-4 two:grid-cols-3 tiny:grid-cols-2 mt-4 grid grid-cols-2 gap-2">
                {currentItems.map((item: any, index: number) => (
                  <PepemapCard
                    key={item.id || item.inscriptionId || index}
                    item={item}
                    pepecoinPrice={pepecoinPrice}
                  />
                ))}
              </div>
              <Pagination className="mt-5">
                <PaginationContent className="flex items-center space-x-2">
                  {/* Previous Button */}
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

                  {/* Dynamic Page Buttons */}
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

                  {/* Next Button */}
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
            </>
          )}
        </TabsContent>
        <TabsContent value="packs">Packs</TabsContent>
        <TabsContent value="activity">Activity</TabsContent>
      </Tabs>
    </>
  );
}
