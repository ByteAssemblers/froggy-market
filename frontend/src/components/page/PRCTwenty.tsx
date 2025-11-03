"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import Image from "next/image";
import Avatar from "../Avatar";

const pepecoinPrice = 0.1957;

export default function PRCTwenty() {
  const router = useRouter();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTokens() {
      try {
        const response = await fetch("/api/belindex/tokens?page_size=10");
        if (!response.ok) throw new Error("Failed to fetch tokens");
        const data = await response.json();
        setTokens(data.tokens);
      } catch (err) {
        console.error("Error fetching tokens:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchTokens();
  }, []);
  
  function toFullNumber(value: number) {
    return value.toString().includes("e")
      ? value.toFixed(20).replace(/\.?0+$/, "")
      : value.toString();
  }

  function formatNumber(value: number, decimals = 6): string {
    if (value === 0) return "0";

    // Handle very small numbers (avoid scientific notation)
    if (Math.abs(value) < 0.000001) {
      return value.toFixed(12).replace(/\.?0+$/, ""); // up to 12 decimals, trimmed
    }

    // Normal numbers: format with a dynamic number of decimals
    const formatted = value.toFixed(decimals).replace(/\.?0+$/, "");
    return formatted;
  }

  return (
    <>
      <h2 className="mt-8 mb-6 text-[1.6rem] leading-[1.1]">PRC-20</h2>
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
          {loading ? (
            <></>
          ) : (
            <TableBody>
              {tokens.map((item, index) => (
                <TableRow
                  key={item.id || index}
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
                      {/* {toFullNumber(item.price)} */}
                    </div>
                    <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                      {/* ${formatNumber(item.price * pepecoinPrice)} */}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.twentyfourhourpercent == 0 && "0%"}
                    {item.twentyfourhourpercent > 0 && (
                      <span className="flex text-[#00FF7F]">
                        <svg
                          viewBox="-139.52 -43.52 599.04 599.04"
                          fill="currentColor"
                          style={{
                            width: "1.5em",
                            marginBottom: "-0.35em",
                          }}
                        >
                          <path d="M288.662 352H31.338c-17.818 0-26.741-21.543-14.142-34.142l128.662-128.662c7.81-7.81 20.474-7.81 28.284 0l128.662 128.662c12.6 12.599 3.676 34.142-14.142 34.142z"></path>
                        </svg>
                        <span className="pt-1">
                          {/* <span>{item.twentyfourhourpercent}%</span> */}
                        </span>
                      </span>
                    )}
                    {item.twentyfourhourpercent < 0 && (
                      <span className="flex text-[#ff6347]">
                        <svg
                          viewBox="-139.52 -43.52 599.04 599.04"
                          fill="currentColor"
                          style={{
                            width: "1.5em",
                            marginBottom: "-0.35em",
                          }}
                        >
                          <path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"></path>
                        </svg>
                        <span className="pt-1">
                          {/* <span>{-item.twentyfourhourpercent}%</span> */}
                        </span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.twentyfourhourvolume == 0 && <>-</>}
                    {item.twentyfourhourvolume != 0 && (
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
                          {/* {item.twentyfourhourvolume} */}
                        </div>
                        <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                          $
                          {/* {(item.twentyfourhourvolume * pepecoinPrice).toFixed(
                            2,
                          )} */}
                        </div>
                      </>
                    )}
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
                      {/* {item.totalvolume.toLocaleString()} */}
                    </div>
                    <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                      $
                      {/* {Number(
                        (item.totalvolume * pepecoinPrice).toFixed(0),
                      ).toLocaleString()} */}
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
                      {/* {item.marketcap.toLocaleString()} */}
                    </div>
                    <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                      $
                      {/* {Number(
                        (item.marketcap * pepecoinPrice).toFixed(0),
                      ).toLocaleString()} */}
                    </div>
                  </TableCell>
                  <TableCell>{item.holders.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          )}
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
