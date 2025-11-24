"use client";

import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import Avatar from "../Avatar";
import { PepemapImage } from "@/app/wallet/[address]/page";
import { Skeleton } from "../ui/skeleton";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

export default function BiggestSalesOfDay() {
  const {
    pepecoinPrice,
    biggestSalesOfDay,
    isBiggestSalesOfDayLoading,
    biggestSalesOfDayError,
  } = useProfile();
  const [bsodList, setBsodList] = useState<any[]>([]);

  useEffect(() => {
    if (biggestSalesOfDay && !isBiggestSalesOfDayLoading) {
      setBsodList(biggestSalesOfDay);
    }
  }, [biggestSalesOfDay, isBiggestSalesOfDayLoading]);

  return (
    <>
      <h2 className="mt-8 mb-6 text-[1.6rem] leading-[1.1] font-bold text-[#00c853]">
        Biggest sales of day
      </h2>
      <Carousel className="w-full">
        <CarouselContent className="-ml-1 w-full">
          {isBiggestSalesOfDayLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <CarouselItem
                key={i}
                className="tiny:basis-1/2 basis-1/1 pl-1 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
              >
                <Skeleton className="bg-transparent">
                  <Card className="relative h-89 w-56"></Card>
                </Skeleton>
              </CarouselItem>
            ))
          ) : (
            <>
              {bsodList.map((item, index) => (
                <CarouselItem
                  key={index}
                  className="tiny:basis-1/2 basis-1/1 pl-1 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                >
                  <Card className="relative w-56 pt-0 pb-0">
                    <div className="pointer-events-none absolute top-0 right-0 rounded-bl-[12px] bg-[#0000006b] px-2 py-0 text-[0.9rem] font-semibold text-white">
                      {item.type === "nft" && <>#{item.asdf}</>}
                    </div>
                    <Link href={`/inscription/${item.inscriptionId}`}>
                      {item.type === "nft" && (
                        <Image
                          src={`${ORD_API_BASE}/content/${item.inscriptionId}`}
                          alt={`BSOD #${item.inscriptionId}`}
                          width={224}
                          height={224}
                          className="block aspect-square w-full rounded-[12px] bg-[#00000080] object-contain [image-rendering:pixelated]"
                          unoptimized
                        />
                      )}
                      {item.type == "pepemap" && (
                        <div className="block aspect-square h-56 w-56 rounded-[12px] bg-[#00000000] object-contain p-12 [image-rendering:pixelated]">
                          <PepemapImage item={item} />
                        </div>
                      )}
                      {item.type == "prc20" && (
                        <div className="block aspect-square h-56 w-56 rounded-[12px] bg-[#00000000] object-contain p-10 [image-rendering:pixelated]">
                          <Avatar text={item.prc20Label} xl />
                        </div>
                      )}
                    </Link>
                    <div className="flex h-full flex-col px-3 pt-1 pb-3">
                      <div className="my-1 flex justify-center gap-4 text-[1.1rem] leading-[1.2] font-semibold text-white">
                        {item.type === "nft" && (
                          <>
                            <span>{item.collectionName}</span>
                            <span>#{item.collectionid}</span>
                          </>
                        )}
                        {item.type === "pepemap" && item.pepemapLabel}
                        {item.type === "prc20" && (
                          <>
                            <span>{item.amount}</span>
                            <span>{item.prc20Label}</span>
                          </>
                        )}
                      </div>
                      <div className="text-[0.8rem] text-[#fffc]">
                        <div className="flex justify-between">
                          <div>Seller:</div>
                          <Link
                            href={`/wallet/${item.sellerAddress || ""}`}
                            className="cursor-pointer font-medium text-[#c891ff] no-underline"
                          >
                            {item.sellerAddress
                              ? `${item.sellerAddress.slice(0, 5)}...${item.sellerAddress.slice(-5)}`
                              : "Unknown"}
                          </Link>
                        </div>
                      </div>
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
                          {item.priceSats}&#xA0;
                          <span className="text-[0.9rem] text-[#fffc]">
                            (${(item.priceSats * pepecoinPrice).toFixed(2)})
                          </span>
                        </div>
                      </div>
                      <Button
                        disabled
                        className="w-full border-none bg-[#ffffff12] font-extrabold text-[#cacaca] transition-all duration-200 ease-in-out"
                      >
                        Sold
                      </Button>
                    </div>
                  </Card>
                </CarouselItem>
              ))}
            </>
          )}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </>
  );
}
