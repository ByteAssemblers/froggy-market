"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FloorPriceChart } from "@/components/FloorPriceChart";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Avatar from "@/components/Avatar";
import axios from "axios";
import { useProfile } from "@/hooks/useProfile";
import { Spinner } from "@/components/ui/spinner";
import { apiClient } from "@/lib/axios";
import { completeBuyPSBT } from "@/lib/marketplace/psbt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, formatMarketCap } from "@/components/page/PRCTwenty";

export default function PRC({ params }: { params: Promise<{ tick: string }> }) {
  const { tick } = use(params);
  const router = useRouter();
  const [isPageValid, setIsPageValid] = useState<boolean | null>(null);
  const [info, setInfo] = useState<any>();
  const [holders, setHolders] = useState<any[]>([]);
  const [prc20List, setPrc20List] = useState<[]>([]);
  const [isBuying, setIsBuying] = useState(false);
  const {
    walletInfo,
    wallet,
    walletAddress,
    privateKey,
    prc20,
    isPrc20Loading,
    prc20Error,
    pepecoinPrice,
    prc20Info,
    isPrc20InfoLoading,
  } = useProfile();

  useEffect(() => {
    walletInfo();
  }, []);

  useEffect(() => {
    const checkUrl = async () => {
      try {
        const response = await fetch(`/api/belindex/token?tick=${tick}`);
        if (response.status === 200) {
          setIsPageValid(true);
        } else if (response.status === 404) {
          setIsPageValid(false);
        }
      } catch (error) {
        console.error("Error fetching URL:", error);
        setIsPageValid(false);
      }
    };
    checkUrl();
  }, [tick]);

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get(`/api/belindex/token?tick=${tick}`);
      setInfo(response.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchHolders = async () => {
      const response = await axios.get(
        `/api/belindex/holders?tick=${tick}&page=1`,
      );
      setHolders(response.data.holders);
    };
    fetchHolders();
  }, []);

  useEffect(() => {
    if (prc20) {
      const prc20List = prc20.filter(
        (item: any) => item.prc20Label.toLowerCase() == tick,
      );
      setPrc20List(prc20List);
    }
  }, [tick, prc20]);

  const handlePrc20Buy = async (item: any) => {
    if (!walletAddress) {
      alert("Please connect your wallet first");
      return;
    }

    if (!privateKey) {
      alert("Wallet not connected. Please unlock your wallet.");
      return;
    }

    try {
      setIsBuying(true);

      // Step 1: Get the listing with PSBT from backend
      const listingResponse = await apiClient.get(
        `/prc20-listings/inscription/${item.inscriptionId}`,
      );

      if (!listingResponse.data.listing?.psbtBase64) {
        throw new Error("Listing PSBT not found");
      }

      const psbtBase64 = listingResponse.data.listing.psbtBase64;

      // Step 2: Complete the PSBT with buyer's payment and broadcast
      const txid = await completeBuyPSBT(
        psbtBase64,
        privateKey,
        walletAddress,
        item.priceSats,
      );

      // Step 3: Update backend with the sale
      await apiClient.post("/prc20-listings/buy", {
        inscriptionId: item.inscriptionId,
        buyerAddress: walletAddress,
        priceSats: item.priceSats,
        txid: txid,
      });

      alert(`PRC-20 purchased successfully! Transaction: ${txid}`);
      // Refresh to show updated status
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert(
        `Failed to buy PRC-20: ${error.response?.data?.message || error.message}`,
      );
    } finally {
      setIsBuying(false);
    }
  };

  if (isPageValid === null || !info) {
    return <div>Loading...</div>; // Optional: show loading state
  }

  if (isPageValid === false) {
    router.push("/"); // Redirect to the first page if 404
    return null;
  }
console.log(info)
  return (
    <>
      <div className="flex gap-x-8">
        <div className="w-0 grow basis-105">
          <div className="mt-4 mb-8 flex items-center justify-between">
            <div className="flex items-center">
              <Avatar text={tick} />
              <div className="ml-4 flex flex-wrap items-center gap-x-12 gap-y-[0.2rem]">
                <h1 className="m-0 text-[2.3rem] leading-[1.1]">{tick}</h1>
                <div className="flex">
                  <Link
                    href="https://www.minidogeart.com/"
                    className="mr-4 leading-none text-[#fffc]"
                  >
                    <svg
                      data-v-1f7beb45=""
                      viewBox="-1.6 -1.6 19.2 19.2"
                      fill="currentColor"
                      width="24"
                      height="24"
                    >
                      <path d="M0 8a8 8 0 1116 0A8 8 0 010 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855-.143.268-.276.56-.395.872.705.157 1.472.257 2.282.287V1.077zM4.249 3.539c.142-.384.304-.744.481-1.078a6.7 6.7 0 01.597-.933A7.01 7.01 0 003.051 3.05c.362.184.763.349 1.198.49zM3.509 7.5c.036-1.07.188-2.087.436-3.008a9.124 9.124 0 01-1.565-.667A6.964 6.964 0 001.018 7.5h2.49zm1.4-2.741a12.344 12.344 0 00-.4 2.741H7.5V5.091c-.91-.03-1.783-.145-2.591-.332zM8.5 5.09V7.5h2.99a12.342 12.342 0 00-.399-2.741c-.808.187-1.681.301-2.591.332zM4.51 8.5c.035.987.176 1.914.399 2.741A13.612 13.612 0 017.5 10.91V8.5H4.51zm3.99 0v2.409c.91.03 1.783.145 2.591.332.223-.827.364-1.754.4-2.741H8.5zm-3.282 3.696c.12.312.252.604.395.872.552 1.035 1.218 1.65 1.887 1.855V11.91c-.81.03-1.577.13-2.282.287zm.11 2.276a6.696 6.696 0 01-.598-.933 8.853 8.853 0 01-.481-1.079 8.38 8.38 0 00-1.198.49 7.01 7.01 0 002.276 1.522zm-1.383-2.964A13.36 13.36 0 013.508 8.5h-2.49a6.963 6.963 0 001.362 3.675c.47-.258.995-.482 1.565-.667zm6.728 2.964a7.009 7.009 0 002.275-1.521 8.376 8.376 0 00-1.197-.49 8.853 8.853 0 01-.481 1.078 6.688 6.688 0 01-.597.933zM8.5 11.909v3.014c.67-.204 1.335-.82 1.887-1.855.143-.268.276-.56.395-.872A12.63 12.63 0 008.5 11.91zm3.555-.401c.57.185 1.095.409 1.565.667A6.963 6.963 0 0014.982 8.5h-2.49a13.36 13.36 0 01-.437 3.008zM14.982 7.5a6.963 6.963 0 00-1.362-3.675c-.47.258-.995.482-1.565.667.248.92.4 1.938.437 3.008h2.49zM11.27 2.461c.177.334.339.694.482 1.078a8.368 8.368 0 001.196-.49 7.01 7.01 0 00-2.275-1.52c.218.283.418.597.597.932zm-.488 1.343a7.765 7.765 0 00-.395-.872C9.835 1.897 9.17 1.282 8.5 1.077V4.09c.81-.03 1.577-.13 2.282-.287z"></path>
                    </svg>
                  </Link>
                  <Link
                    href="https://x.com/minidogeart"
                    className="leading-none text-[#fffc]"
                  >
                    <svg
                      data-v-1f7beb45=""
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                    >
                      <path
                        strokeWidth="1.5"
                        d="M11.3032 9.42806L16.4029 3.5H15.1945L10.7663 8.64725L7.2296 3.5H3.15039L8.49863 11.2836L3.15039 17.5H4.35894L9.03516 12.0644L12.7702 17.5H16.8494L11.3029 9.42806H11.3032ZM9.6479 11.3521L9.10601 10.5771L4.7944 4.40978H6.65066L10.1302 9.38698L10.6721 10.162L15.195 16.6316H13.3388L9.6479 11.3524V11.3521Z"
                        fill="currentColor"
                      ></path>
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-8">
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
                  {prc20Info?.filter(
                    (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                  )[0]?.floorPrice
                    ? formatPrice(
                        prc20Info?.filter(
                          (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                        )[0]?.floorPrice,
                      )
                    : "-"}
                </div>
                <div className="text-[90%] leading-none text-[#fffc]">
                  Price
                </div>
              </div>
              <div className="mb-2 ml-12">
                <div className="font-bold">
                  {prc20Info?.filter(
                    (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                  )[0] ? (
                    <>
                      {prc20Info?.filter(
                        (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                      )[0]?.change24h == 0 && "0%"}
                      {prc20Info?.filter(
                        (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                      )[0]?.change24h > 0 && (
                        <span className="flex text-[#00ff7f]">
                          <svg
                            viewBox="-139.52 -43.52 599.04 599.04"
                            fill="currentColor"
                            className="mb-[-0.35em] w-[1.5em]"
                          >
                            <path d="M288.662 352H31.338c-17.818 0-26.741-21.543-14.142-34.142l128.662-128.662c7.81-7.81 20.474-7.81 28.284 0l128.662 128.662c12.6 12.599 3.676 34.142-14.142 34.142z"></path>
                          </svg>
                          <span>
                            {Number(
                              prc20Info?.filter(
                                (i: any) =>
                                  i.tick.toLowerCase() == tick.toLowerCase(),
                              )[0]?.change24h,
                            ).toFixed(2)}
                            %
                          </span>
                        </span>
                      )}
                      {prc20Info?.filter(
                        (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                      )[0]?.change24h < 0 && (
                        <span className="flex text-[#ff6347]">
                          <svg
                            viewBox="-139.52 -43.52 599.04 599.04"
                            fill="currentColor"
                            className="mb-[-0.35em] w-[1.5em]"
                          >
                            <path d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"></path>
                          </svg>
                          <span>
                            -
                            {Number(
                              prc20Info?.filter(
                                (i: any) =>
                                  i.tick.toLowerCase() == tick.toLowerCase(),
                              )[0]?.change24h,
                            ).toFixed(2)}
                            %
                          </span>
                        </span>
                      )}
                    </>
                  ) : (
                    "-"
                  )}
                </div>
                <div className="text-[90%] leading-none text-[#fffc]">
                  24h %
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
                  {prc20Info?.filter(
                    (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                  )[0]?.volume24h
                    ? formatMarketCap(
                        prc20Info?.filter(
                          (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                        )[0]?.volume24h,
                      )
                    : "-"}
                </div>
                <div className="text-[90%] leading-none text-[#fffc]">
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
                  {prc20Info?.filter(
                    (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                  )[0]?.totalVolume
                    ? formatMarketCap(
                        prc20Info?.filter(
                          (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                        )[0]?.totalVolume,
                      )
                    : "-"}
                </div>
                <div className="text-[90%] leading-none text-[#fffc]">
                  Total volume
                </div>
              </div>
              <div className="mb-2 ml-12">
                <div className="font-bold">
                  {prc20Info?.filter(
                    (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                  )[0]?.floorPrice && info?.max
                    ? "$" +
                      formatMarketCap(
                        prc20Info?.filter(
                          (i: any) => i.tick.toLowerCase() == tick.toLowerCase(),
                        )[0]?.floorPrice *
                          info.max *
                          pepecoinPrice,
                      )
                    : "$-"}
                </div>
                <div className="text-[90%] leading-none text-[#fffc]">
                  Market cap
                </div>
              </div>
            </div>
            <div className="-ml-12 flex flex-wrap">
              <div className="mb-2 ml-12">
                <div className="font-bold">
                  {Number(info.max).toLocaleString()}
                </div>
                <div className="text-[90%] leading-none text-[#fffc]">
                  Total supply
                </div>
              </div>
              <div className="mb-2 ml-12">
                <div className="font-bold">
                  {Number(info.mint_percent).toFixed(2)}%
                </div>
                <div className="text-[90%] leading-none text-[#fffc]">
                  Minted
                </div>
              </div>
              <div className="mb-2 ml-12">
                <div className="font-bold">{info.holders.toLocaleString()}</div>
                <div className="text-[90%] leading-none text-[#fffc]">
                  Holders
                </div>
              </div>
            </div>
          </div>
          <div>
            <FloorPriceChart />
          </div>
        </div>
        <div className="mt-6 w-105">
          <div className="h-160 overflow-y-auto">
            <div className="flex flex-col gap-4 px-1 text-white">
              {isPrc20Loading ? (
                <div className="flex justify-center">
                  <Spinner className="size-6" />
                </div>
              ) : prc20List.length !== 0 ? (
                prc20List.map((item: any, index) => (
                  <div key={index}>
                    <div className="my-1 flex justify-between px-1 text-[1.05rem] font-medium">
                      <div className="flex">
                        <Image
                          src="/assets/coin.gif"
                          alt="coin"
                          width={18}
                          height={18}
                          priority
                          className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                        />
                        {formatPrice(item.priceSats / item.amount)}
                        <span className="text-[0.9rem] font-normal text-white/80">
                          /{tick}
                        </span>
                      </div>
                      <div className="text-base text-white/80">
                        $
                        {formatPrice(
                          (item.priceSats / item.amount) *
                          pepecoinPrice
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#4c505c33] p-2">
                        <div className="ml-1">
                          <div className="flex font-medium">
                            <Image
                              src="/assets/coin.gif"
                              alt="coin"
                              width={18}
                              height={18}
                              priority
                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                            />
                            {formatMarketCap(item.priceSats)}
                          </div>
                          <div className="text-[0.9rem] text-white/75">
                            ${formatMarketCap(item.priceSats * pepecoinPrice)}
                          </div>
                        </div>
                        <div className="flex grow justify-center text-[#bb8e20]">
                          <ArrowRight />
                        </div>
                        <div className="leading-[1.2]">
                          <div className="flex items-center">
                            <div className="font-medium">{item.amount}</div>
                          </div>
                          <div className="w-full text-right text-[0.9rem] text-white/80">
                            {tick}
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePrc20Buy(item)}
                          className="text-md ml-4 bg-[#3d301b] text-[#feae32] hover:cursor-pointer hover:bg-[#b8860b] hover:text-white"
                        >
                          Buy
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center">nothing to show</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Tabs defaultValue="activity" className="relative">
        <TabsList className="my-4 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
          <div className="my-2 flex list-none gap-5 overflow-x-auto p-0 select-none">
            <TabsTrigger value="activity" className="text-md">
              Activity
            </TabsTrigger>
            <TabsTrigger value="holders" className="text-md">
              Holders
            </TabsTrigger>
            <TabsTrigger value="transaction" className="text-md">
              Transaction
            </TabsTrigger>
            <TabsTrigger value="info" className="text-md">
              Info
            </TabsTrigger>
          </div>
        </TabsList>
        <TabsContent value="activity">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>Tick</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              {[...Array(20)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-x-[1.2rem]">
                      <Link
                        href={`/${tick}`}
                        className="flex-none basis-[42px] leading-0 text-inherit"
                      >
                        <Avatar text={tick} />
                      </Link>
                      <div>
                        <span className="leading-[1.1]">{tick}</span>
                        <div className="leading-none">
                          <Link
                            href="inscription/db36e9ab573c91ca9699b142c948a5f110f4ea60fda60a4666182c07fbfb1a0fi0"
                            className="text-[0.7rem] text-[#dfc0fd]"
                          >
                            #179506592
                          </Link>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-[6px] bg-[#00d1814d] px-1 py-0.5 text-[0.8rem] text-[#00d181]">
                      sell
                    </span>
                    {/* <span className="text-[#dc3545] bg-[#dc35454d] text-[0.8rem] px-1 py-0.5 rounded-[6px]">unlist</span> */}
                    {/* <span className="text-[#027dff] bg-[#027dff4d] text-[0.8rem] px-1 py-0.5 rounded-[6px]">list</span> */}
                  </TableCell>
                  <TableCell>500</TableCell>
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
                      302
                    </div>
                    <div className="flex text-[0.9rem]">
                      <Image
                        src="/assets/coin.gif"
                        alt="coin"
                        width={16}
                        height={16}
                        priority
                        className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                      />
                      0.6/{tick}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href="https://doggy.market/wallet/DLMmfAuYGjjUABeBHBbkt16kL4zBwWFgtm"
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      DLMmf...WFgtm
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href="https://doggy.market/wallet/DMig5rkKZhpn3F7Mxw6wV2kra7La8sF4DP"
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      DMig5...sF4DP
                    </Link>
                  </TableCell>
                  <TableCell>14 minutes ago</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="holders">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>#</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Total balance</TableHead>
                <TableHead>
                  % of total
                  <br />
                  supply
                </TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Inscribed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              {holders.map((item: any) => (
                <TableRow key={item.rank}>
                  <TableCell>{item.rank}</TableCell>
                  <TableCell>
                    <Link
                      href={`wallet/${item.address}`}
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      {item.address}
                    </Link>
                  </TableCell>
                  <TableCell>{Number(item.balance).toLocaleString()}</TableCell>
                  <TableCell>{Number(item.percent).toFixed(2)}%</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-,---,---</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="transaction">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>Inscription</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Tick</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              {[...Array(20)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Link
                      href="/inscription/a93204a8caa7ba24ab3425974277fb39953773101ef0c22e47b8bb15081d777ei0"
                      className="cursor-pointer font-medium text-[#dfc0fd] decoration-inherit"
                    >
                      a93...ei0
                    </Link>
                  </TableCell>
                  <TableCell>transfer</TableCell>
                  <TableCell>{tick}</TableCell>
                  <TableCell>100</TableCell>
                  <TableCell>
                    <Link
                      href="wallet/DNKjZ3Tt3bwrVPFkvF43T8WcncXjDoXKVY"
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      DNKjZ...oXKVY
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href="wallet/DRjY9RJfhQGLxmwa4EVh66az2KuXyzh1tB"
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      DRjY9...zh1tB
                    </Link>
                  </TableCell>
                  <TableCell>
                    27.10.2025
                    <br />
                    03:49:38
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="info">
          <div className="flex">
            <div className="mr-8">
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Inscription</div>
                <div className="font-bold">
                  <Link
                    href={`/inscription/${info.genesis}`}
                    className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                  >
                    {info.genesis.slice(0, 5)}...{info.genesis.slice(-5)}
                  </Link>
                </div>
              </div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Total supply</div>
                <div className="font-bold">
                  {Number(info.max).toLocaleString()}
                </div>
              </div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Minted</div>
                <div className="font-bold">
                  {Number(info.max).toLocaleString()} |
                  {Number(info.mint_percent).toFixed(2)}%
                </div>
              </div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Mint limit</div>
                <div className="font-bold">
                  {Number(info.lim).toLocaleString()}
                </div>
              </div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Decimals</div>
                <div className="font-bold">{info.dec}</div>
              </div>
            </div>
            <div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Deployer address</div>
                <div className="font-bold">
                  <Link
                    href={`/wallet/${info.deployer}`}
                    className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                  >
                    {info.deployer.slice(0, 5)}...{info.deployer.slice(-5)}
                  </Link>
                </div>
              </div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Deployed at</div>
                <div className="font-bold">
                  {new Date(info.created * 1000).toLocaleString("en-GB")}
                </div>
              </div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Holders</div>
                <div className="font-bold">{info.holders.toLocaleString()}</div>
              </div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Transfers</div>
                <div className="font-bold">{info.height.toLocaleString()}</div>
              </div>
              <div className="mb-2 whitespace-nowrap">
                <div className="text-[90%] leading-none">Mint transactions</div>
                <div className="font-bold">
                  {info.transactions.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
