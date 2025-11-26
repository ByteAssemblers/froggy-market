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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPrice, formatMarketCap } from "@/components/page/PRCTwenty";
import { toast } from "sonner";

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
    prc20FloorPrice,
    isPrc20FloorPriceLoading,
    prc20Activity,
    isPrc20ActivityLoading,
    prc20Transaction,
    isPrc20TransactionLoading,
  } = useProfile();

  // Helper function to get prc20 floor price history by tick
  const getPrc20FloorPriceData = () => {
    if (!prc20FloorPrice || !Array.isArray(prc20FloorPrice)) return null;
    const token = prc20FloorPrice.find(
      (item: any) => item.tick.toLowerCase() === tick.toLowerCase(),
    );
    return token?.history || null;
  };

  const floorPriceData = getPrc20FloorPriceData();

  // Helper function to get prc20 activity by tick
  const getPrc20ActivityData = () => {
    if (!prc20Activity || !Array.isArray(prc20Activity)) return null;
    const token = prc20Activity.find(
      (item: any) => item.tick.toLowerCase() === tick.toLowerCase(),
    );
    return token?.activity || null;
  };

  const activityData = getPrc20ActivityData();

  // Helper function to get prc20 transaction by tick
  const getPrc20TransactionData = () => {
    if (!prc20Transaction || !Array.isArray(prc20Transaction)) return null;
    const token = prc20Transaction.find(
      (item: any) => item.tick.toLowerCase() === tick.toLowerCase(),
    );
    return token?.transactions || null;
  };

  const transactionData = getPrc20TransactionData();

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
      toast.error("Please connect your wallet first");
      return;
    }

    if (!privateKey) {
      toast.error("Wallet not connected. Please unlock your wallet.");
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

      toast.success(`PRC-20 purchased successfully! Transaction: ${txid}`);
      // Refresh to show updated status
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      toast.error(
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
                    className="mr-4 leading-none"
                  >
                    <Image
                      src="/assets/icons/globe.svg"
                      width={24}
                      height={24}
                      alt="globe"
                    />
                  </Link>
                  <Link
                    href="https://x.com/minidogeart"
                    className="leading-none"
                  >
                    <Image
                      src="/assets/icons/x-logo.svg"
                      width={24}
                      height={24}
                      alt="x logo"
                    />
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
                          (i: any) =>
                            i.tick.toLowerCase() == tick.toLowerCase(),
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
                        <span className="flex">
                          <Image
                            src="/assets/icons/arrow-up.svg"
                            width={24}
                            height={24}
                            alt="arrow-up"
                          />
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
                        <span className="flex">
                          <Image
                            src="/assets/icons/arrow-down.svg"
                            width={24}
                            height={24}
                            alt="arrow-down"
                          />
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
                          (i: any) =>
                            i.tick.toLowerCase() == tick.toLowerCase(),
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
                          (i: any) =>
                            i.tick.toLowerCase() == tick.toLowerCase(),
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
                          (i: any) =>
                            i.tick.toLowerCase() == tick.toLowerCase(),
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
            <FloorPriceChart
              data={floorPriceData}
              isLoading={isPrc20FloorPriceLoading}
            />
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
                          (item.priceSats / item.amount) * pepecoinPrice,
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
            {isPrc20ActivityLoading ? (
              <TableFooter className="bg-transparent">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="text-center">
                    <Spinner className="m-auto size-6" />
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : (
              <>
                {activityData ? (
                  activityData.map((item: any, index: any) => (
                    <TableBody key={index} className="text-[16px]">
                      <TableRow>
                        <TableCell>
                          <div className="flex items-center gap-x-[1.2rem]">
                            <Link href={`/inscription/${item.inscriptionId}`}>
                              <Avatar text={tick} />
                            </Link>
                            <div>
                              <span className="leading-[1.1]">{tick}</span>
                              <div className="leading-none">
                                <Link
                                  href={`/inscription/${item.inscriptionId}`}
                                  className="text-[0.7rem] text-[#dfc0fd]"
                                >
                                  {item.inscriptionId.slice(0, 3) +
                                    "..." +
                                    item.inscriptionId.slice(-3)}
                                </Link>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.status == "sold" && (
                            <span className="rounded-[6px] bg-[#00d1814d] px-1 py-0.5 text-[0.8rem] text-[#00d181]">
                              sell
                            </span>
                          )}
                          {item.status == "unlisted" && (
                            <span className="rounded-[6px] bg-[#dc35454d] px-1 py-0.5 text-[0.8rem] text-[#dc3545]">
                              unlist
                            </span>
                          )}
                          {item.status == "listed" && (
                            <span className="rounded-[6px] bg-[#027dff4d] px-1 py-0.5 text-[0.8rem] text-[#027dff]">
                              list
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {Number(item.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {item.status != "unlisted" ? (
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
                                {Number(item.priceSats).toLocaleString()}
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
                                {formatPrice(item.priceSats / item.amount)}/
                                {tick}
                              </div>
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/wallet/${item.sellerAddress}`}
                            className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                          >
                            {item.sellerAddress.slice(0, 5) +
                              "..." +
                              item.sellerAddress.slice(-5)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/wallet/${item.buyerAddress}`}
                            className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                          >
                            {item.buyerAddress &&
                              item.buyerAddress?.slice(0, 5) +
                                "..." +
                                item.buyerAddress?.slice(-5)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.createdAt.slice(0, 10)}
                          <br />
                          {item.createdAt.slice(11, 19)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  ))
                ) : (
                  <TableFooter className="bg-transparent">
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={7} className="text-center">
                        No activity data available
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </>
            )}
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
            {isPrc20TransactionLoading ? (
              <TableFooter className="bg-transparent">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center">
                    <Spinner className="m-auto size-6" />
                  </TableCell>
                </TableRow>
              </TableFooter>
            ) : (
              <>
                {transactionData ? (
                  <TableBody className="text-[16px]">
                    {transactionData.map((item: any, index: any) => (
                      <TableRow
                        key={index}
                        className="cursor-pointer text-[16px] text-white transition-all duration-150 ease-in-out"
                      >
                        <TableCell>
                          <Link
                            href={`/inscription/${item.inscriptionId}`}
                            className="cursor-pointer font-medium text-[#dfc0fd] decoration-inherit"
                          >
                            {item.inscriptionId.slice(0, 3) +
                              "..." +
                              item.inscriptionId.slice(-3)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.status == "transfer" && (
                            <>
                              inscribe-
                              <br />
                              transfer
                            </>
                          )}
                          {item.status == "sold" && "transfer"}
                        </TableCell>
                        <TableCell>{item.prc20Label}</TableCell>
                        <TableCell>
                          {Number(item.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/wallet/${item.sellerAddress}`}
                            className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                          >
                            {item.sellerAddress.slice(0, 5) +
                              "..." +
                              item.sellerAddress.slice(-5)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {item.buyerAddress && (
                            <Link
                              href={`/wallet/${item.buyerAddress}`}
                              className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                            >
                              {item.buyerAddress.slice(0, 5) +
                                "..." +
                                item.buyerAddress.slice(-5)}
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.createdAt.slice(0, 10)}
                          <br />
                          {item.createdAt.slice(11, 19)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                ) : (
                  <TableFooter className="bg-transparent">
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="text-center">
                        No activity data available
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </>
            )}
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
