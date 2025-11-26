"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProfile } from "@/hooks/useProfile";
import Avatar from "../Avatar";
import { Skeleton } from "../ui/skeleton";

// Format price to show only 2 significant (non-zero) digits
export function formatPrice(value: number): string {
  if (value === 0) return "0";

  const absValue = Math.abs(value);

  if (absValue >= 1) {
    // For numbers >= 1, show 2 decimal places
    return value.toFixed(2).replace(/\.?0+$/, "");
  } else {
    // For numbers < 1, find first 2 non-zero significant digits
    // Use toFixed to avoid scientific notation
    const str = absValue.toFixed(20);
    const decimalIndex = str.indexOf(".");
    if (decimalIndex === -1) return value.toString();

    // Count leading zeros after decimal
    let firstNonZero = -1;
    for (let i = decimalIndex + 1; i < str.length; i++) {
      if (str[i] !== "0") {
        firstNonZero = i;
        break;
      }
    }

    if (firstNonZero === -1) return "0";

    // Show 2 significant digits: positions firstNonZero and firstNonZero + 1
    // Number of decimal places needed = (firstNonZero + 1) - decimalIndex
    const decimals = firstNonZero + 1 - decimalIndex;
    return value.toFixed(Math.min(decimals, 20));
  }
}

// Format market cap with K, M, B, T abbreviations
export function formatMarketCap(value: number): string {
  if (value === 0) return "0";

  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000_000) {
    // Trillions
    return sign + (absValue / 1_000_000_000_000).toFixed(2) + "T";
  } else if (absValue >= 1_000_000_000) {
    // Billions
    return sign + (absValue / 1_000_000_000).toFixed(2) + "B";
  } else if (absValue >= 1_000_000) {
    // Millions
    return sign + (absValue / 1_000_000).toFixed(2) + "M";
  } else if (absValue >= 1_000) {
    // Thousands
    return sign + (absValue / 1_000).toFixed(2) + "K";
  } else {
    return value.toFixed(2);
  }
}

export default function PRCTwenty() {
  const router = useRouter();
  const {
    pepecoinPrice,
    tokens,
    isTokensLoading,
    prc20Info,
    isPrc20InfoLoading,
  } = useProfile();

  return (
    <>
      <h2 className="mt-8 mb-6 text-[1.6rem] leading-[1.1] font-bold text-[#00c853]">
        PRC-20
      </h2>
      <div className="px-2.0 w-full overflow-x-auto">
        <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
          <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
            <TableRow className="">
              <TableHead>#</TableHead>
              <TableHead>&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;</TableHead>
              <TableHead>Tick</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>24h %</TableHead>
              <TableHead>Volume (24h)</TableHead>
              <TableHead>Total volume</TableHead>
              <TableHead>Market cap</TableHead>
              <TableHead>Holders</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isTokensLoading || isPrc20InfoLoading ? (
              <>
                {[
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer text-[16px] text-white transition-all duration-150 ease-in-out"
                    >
                      <TableCell className="w-auto rounded-tl-[12px] rounded-bl-[12px] px-3 py-4 align-middle font-bold">
                        <Skeleton className="bg-transparent">
                          {index + 1}
                        </Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-12 w-12 items-center justify-center rounded-md bg-[#4c505c33] text-lg font-bold shadow-md"></Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="bg-transparent">----</Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="bg-transparent">
                          <div className="flex">
                            <Image
                              src="/assets/coin.gif"
                              alt="coin"
                              width={18}
                              height={18}
                              priority
                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                            />
                            ----
                          </div>
                          <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                            $----
                          </div>
                        </Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="bg-transparent">0%</Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="bg-transparent">
                          <div className="flex">
                            <Image
                              src="/assets/coin.gif"
                              alt="coin"
                              width={18}
                              height={18}
                              priority
                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                            />
                            ----
                          </div>
                          <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                            $----
                          </div>
                        </Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="bg-transparent">
                          <div className="flex">
                            <Image
                              src="/assets/coin.gif"
                              alt="coin"
                              width={18}
                              height={18}
                              priority
                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                            />
                            ----
                          </div>
                          <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                            $----
                          </div>
                        </Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="bg-transparent">
                          <div className="flex">
                            <Image
                              src="/assets/coin.gif"
                              alt="coin"
                              width={18}
                              height={18}
                              priority
                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                            />
                            ----
                          </div>
                          <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                            $----
                          </div>
                        </Skeleton>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="bg-transparent">----</Skeleton>
                      </TableCell>
                    </TableRow>
                  )),
                ]}
              </>
            ) : (
              tokens.slice(0, 10).map((item: any, index: any) => (
                <TableRow
                  key={index}
                  className="cursor-pointer text-[16px] text-white transition-all duration-150 ease-in-out"
                  onClick={() => router.push(`/${item.tick}`)}
                >
                  <TableCell className="w-auto rounded-tl-[12px] rounded-bl-[12px] px-3 py-4 align-middle font-bold">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Avatar text={item.tick} />
                  </TableCell>
                  <TableCell>{item.tick}</TableCell>
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
                      {prc20Info?.filter(
                        (i: any) =>
                          i.tick.toLowerCase() == item.tick.toLowerCase(),
                      )[0]?.floorPrice
                        ? formatPrice(
                            prc20Info?.filter(
                              (i: any) =>
                                i.tick.toLowerCase() == item.tick.toLowerCase(),
                            )[0]?.floorPrice,
                          )
                        : 0}
                    </div>
                    <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                      $
                      {prc20Info?.filter(
                        (i: any) =>
                          i.tick.toLowerCase() == item.tick.toLowerCase(),
                      )[0]?.floorPrice
                        ? formatPrice(
                            prc20Info?.filter(
                              (i: any) =>
                                i.tick.toLowerCase() == item.tick.toLowerCase(),
                            )[0]?.floorPrice * pepecoinPrice,
                          )
                        : 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    {prc20Info?.filter(
                      (i: any) =>
                        i.tick.toLowerCase() == item.tick.toLowerCase(),
                    )[0] ? (
                      <>
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.change24h == 0 && "0%"}
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.change24h > 0 && (
                          <span className="flex text-[#00FF7F]">
                            <Image
                              src="/assets/icons/arrow-up.svg"
                              width={24}
                              height={24}
                              alt="arrow-up"
                              style={{
                                width: "1.5em",
                                marginBottom: "-0.35em",
                              }}
                            />
                            <span className="pt-1">
                              <span>
                                {Number(
                                  prc20Info?.filter(
                                    (i: any) =>
                                      i.tick.toLowerCase() ==
                                      item.tick.toLowerCase(),
                                  )[0]?.change24h,
                                ).toFixed(2)}
                                %
                              </span>
                            </span>
                          </span>
                        )}
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.change24h < 0 && (
                          <span className="flex text-[#ff6347]">
                            <Image
                              src="/assets/icons/arrow-down.svg"
                              width={24}
                              height={24}
                              alt="arrow-down"
                              style={{
                                width: "1.5em",
                                marginBottom: "-0.35em",
                              }}
                            />
                            <span className="pt-1">
                              <span>
                                -
                                {Number(
                                  prc20Info?.filter(
                                    (i: any) =>
                                      i.tick.toLowerCase() ==
                                      item.tick.toLowerCase(),
                                  )[0]?.change24h,
                                ).toFixed(2)}
                                %
                              </span>
                            </span>
                          </span>
                        )}
                      </>
                    ) : (
                      "0%"
                    )}
                  </TableCell>
                  <TableCell>
                    {prc20Info?.filter(
                      (i: any) =>
                        i.tick.toLowerCase() == item.tick.toLowerCase(),
                    )[0] ? (
                      <>
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.volume24h == 0 && "-"}
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.volume24h != 0 && (
                          <>
                            <div className="flex">
                              <Image
                                src="/assets/coin.gif"
                                alt="coin"
                                width={18}
                                height={18}
                                priority
                                className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                              />
                              {formatMarketCap(
                                prc20Info?.filter(
                                  (i: any) =>
                                    i.tick.toLowerCase() ==
                                    item.tick.toLowerCase(),
                                )[0]?.volume24h,
                              )}
                            </div>
                            <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                              $
                              {formatMarketCap(
                                prc20Info?.filter(
                                  (i: any) =>
                                    i.tick.toLowerCase() ==
                                    item.tick.toLowerCase(),
                                )[0]?.volume24h * pepecoinPrice,
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {prc20Info?.filter(
                      (i: any) =>
                        i.tick.toLowerCase() == item.tick.toLowerCase(),
                    )[0] ? (
                      <>
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.totalVolume == 0 && "-"}
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.totalVolume != 0 && (
                          <>
                            <div className="flex">
                              <Image
                                src="/assets/coin.gif"
                                alt="coin"
                                width={18}
                                height={18}
                                priority
                                className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                              />
                              {formatMarketCap(
                                prc20Info?.filter(
                                  (i: any) =>
                                    i.tick.toLowerCase() ==
                                    item.tick.toLowerCase(),
                                )[0]?.totalVolume,
                              )}
                            </div>
                            <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                              $
                              {formatMarketCap(
                                prc20Info?.filter(
                                  (i: any) =>
                                    i.tick.toLowerCase() ==
                                    item.tick.toLowerCase(),
                                )[0]?.totalVolume * pepecoinPrice,
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {prc20Info?.filter(
                      (i: any) =>
                        i.tick.toLowerCase() == item.tick.toLowerCase(),
                    )[0] ? (
                      <>
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.floorPrice == 0 ? (
                          "-"
                        ) : (
                          <>
                            <div className="flex">
                              <Image
                                src="/assets/coin.gif"
                                alt="coin"
                                width={18}
                                height={18}
                                priority
                                className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                              />
                              {formatMarketCap(
                                prc20Info?.filter(
                                  (i: any) =>
                                    i.tick.toLowerCase() ==
                                    item.tick.toLowerCase(),
                                )[0]?.floorPrice * item.supply,
                              )}
                            </div>
                            <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                              $
                              {formatMarketCap(
                                prc20Info?.filter(
                                  (i: any) =>
                                    i.tick.toLowerCase() ==
                                    item.tick.toLowerCase(),
                                )[0]?.floorPrice *
                                  item.supply *
                                  pepecoinPrice,
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{item.holders.toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="my-4 flex items-center justify-center">
        <Link
          href="/prc-20"
          className="flex items-center justify-center rounded-[12px] px-12 py-5 font-bold text-[#fbb9fb] transition-all duration-150 ease-in-out hover:bg-[#1D1E20] hover:text-[violet]"
        >
          <div className="flex items-center">Show all PRC-20 tokens</div>
        </Link>
      </div>
    </>
  );
}
