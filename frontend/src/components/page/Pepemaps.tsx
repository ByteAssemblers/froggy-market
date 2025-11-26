"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import PepemapCard from "@/components/PepemapCard";
import { Skeleton } from "../ui/skeleton";
import { formatPrice } from "./PRCTwenty";

export default function Pepemaps() {
  const {
    pepecoinPrice,
    pepemaps,
    isPepemapsLoading,
    pepemapInfo,
    isPepemapInfoLoading,
  } = useProfile();
  const [showPepemaps, setShowPepemaps] = useState<[]>([]);
  const [arrayNumber, setArrayNumber] = useState(0);
  const listing = pepemaps || [];
  const isLoading = isPepemapsLoading && isPepemapInfoLoading;

  useEffect(() => {
    const updateData = () => {
      if (window.matchMedia("(min-width: 1112px)").matches) {
        setShowPepemaps(listing.slice(0, 4));
        setArrayNumber(4);
      } else if (window.matchMedia("(min-width: 900px)").matches) {
        setShowPepemaps(listing.slice(0, 3));
        setArrayNumber(3);
      } else if (window.matchMedia("(min-width: 678px)").matches) {
        setShowPepemaps(listing.slice(0, 5));
        setArrayNumber(5);
      } else {
        setShowPepemaps(listing.slice(0, 3));
        setArrayNumber(3);
      }
    };

    updateData();
    window.addEventListener("resize", updateData);
    return () => window.removeEventListener("resize", updateData);
  }, [pepemaps]);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="mt-0 mb-0 text-[1.6rem] leading-[1.1] font-bold text-[#00c853]">
            Pepemaps
          </h2>
          <div className="flex">
            Floor price:&#xA0;
            <Image
              src="/assets/coin.gif"
              alt="coin"
              width={18}
              height={18}
              priority
              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
              unoptimized
            />
            <span className="flex text-white/95">
              {isLoading
                ? "-"
                : pepemapInfo?.floorPrice
                  ? formatPrice(pepemapInfo.floorPrice)
                  : "-"}
              &#xA0;
              {pepemapInfo?.change24h == 0 && <></>}
              {pepemapInfo?.change24h > 0 && (
                <span className="flex text-[0.8rem] text-[#00FF7F]">
                  <Image
                    src="/assets/icons/arrow-up.svg"
                    width={24}
                    height={24}
                    alt="arrow-up"
                  />
                  <span className="pt-1">
                    <span>{Number(pepemapInfo?.change24h).toFixed(2)}%</span>
                  </span>
                </span>
              )}
              {pepemapInfo?.change24h < 0 && (
                <span className="flex text-[0.8rem] text-[#ff6347]">
                  <Image
                    src="/assets/icons/arrow-down.svg"
                    width={24}
                    height={24}
                    alt="arrow-down"
                  />
                  <span className="pt-1">
                    <span>{-Number(pepemapInfo?.change24h).toFixed(2)}%</span>
                  </span>
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
      <div className="tiny:gap-5 four:grid-cols-5 three:grid-cols-4 two:grid-cols-3 tiny:grid-cols-2 mt-4 grid grid-cols-2 gap-2">
        {isLoading
          ? [...Array(arrayNumber)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-69 rounded-[12px] bg-[#4c505c33]"
              />
            ))
          : showPepemaps.map((item: any, index: number) => (
              <PepemapCard
                key={item.id || item.inscriptionId || index}
                item={item}
                pepecoinPrice={pepecoinPrice}
              />
            ))}
        <Link
          href="/pepemaps"
          className="flex min-h-56 items-center justify-center rounded-[12px] border border-transparent bg-[#4c505c33] font-bold text-[#fbb9fb] transition-all duration-250 ease-in-out hover:border-[violet] hover:text-[violet]"
        >
          <div className="p-3 text-center">Show all listed pepemaps</div>
        </Link>
      </div>
    </>
  );
}
