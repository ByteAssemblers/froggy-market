"use client";

import Link from "next/link";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";
import {
  IconBrandX,
  IconBrandDiscord,
  IconBrandTelegram,
} from "@tabler/icons-react";

export default function Footer() {
  const { marketplaceStats, isMarketplaceStatsLoading, marketplaceStatsError } =
    useProfile();

  return (
    <div className="flex w-full justify-center border-t border-[#454545] bg-[#0a0a0a] py-4">
      <div className="mx-4 w-full max-w-[1200px] text-[#eaeaea]">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <div className="flex items-center">
            <Image
              src="/assets/Logo.png"
              alt="logo"
              width={32}
              height={32}
              priority
            />
            <div className="mr-6 ml-4 text-[1.2rem] leading-[1.2] font-semibold">
              <span>Froggy</span>
              <span className="ml-[0.25em]">Market</span>
            </div>
            <Link
              href="https://x.com/_froggymarket?s=21"
              className="flex items-center rounded-[12px] border-0 p-[0.4rem_0.6rem] text-[0.8rem] leading-none text-white transition-all duration-150 ease-in-out hover:text-[#00c853]"
            >
              <IconBrandX stroke={1.5} size={32} />
            </Link>
            <Link
              href="https://discord.gg/ehHUsGEmFE"
              className="flex items-center rounded-[12px] border-0 p-[0.4rem_0.6rem] text-[0.8rem] leading-none text-white transition-all duration-150 ease-in-out hover:text-[#00c853]"
            >
              <IconBrandDiscord stroke={1.5} size={32} />
            </Link>
            <Link
              href="https://t.me/froggymarkettg"
              className="flex items-center rounded-[12px] border-0 p-[0.4rem_0.6rem] text-[0.8rem] leading-none text-white transition-all duration-150 ease-in-out hover:text-[#00c853]"
            >
              <IconBrandTelegram stroke={1.5} size={32} />
            </Link>
          </div>
          {!isMarketplaceStatsLoading && (
            <div>
              <div className="flex flex-row">
                <span className="w-48">24h Market Volume</span>
                <div className="flex flex-row gap-2">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  {Number(marketplaceStats.volume24h).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-row">
                <span className="w-48">Total Volume</span>
                <div className="flex flex-row gap-2">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  {Number(marketplaceStats.totalVolume).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="inline-flex flex-wrap gap-x-6 text-[0.9rem] text-[#c891d8]">
            <Link href="/inscribe">Inscribe on pepinals</Link>
            <Link href="/creators">Creators dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
