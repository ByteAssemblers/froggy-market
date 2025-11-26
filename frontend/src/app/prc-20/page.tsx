"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";
import Avatar from "@/components/Avatar";
import { useProfile } from "@/hooks/useProfile";
import { formatPrice, formatMarketCap } from "@/components/page/PRCTwenty";

export default function PRC() {
  const {
    pepecoinPrice,
    tokens,
    isTokensLoading,
    prc20Info,
    isPrc20InfoLoading,
  } = useProfile();

  const router = useRouter();

  if (isTokensLoading) return <div>Loading...</div>;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[1.6rem] leading-[1.1]">PRC-20</h2>
      </div>
      <Tabs defaultValue="toptokens" className="relative">
        <TabsList className="my-4 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
          <div className="my-2 flex list-none gap-5 overflow-x-auto p-0 select-none">
            <TabsTrigger value="toptokens" className="text-md">
              Top tokens
            </TabsTrigger>
            <TabsTrigger value="mintingnow" className="text-md">
              Minting now
            </TabsTrigger>
          </div>
          <TabsContent value="toptokens">
            <div className="absolute right-0 flex gap-2 text-center text-white">
              24h 7d 30d All
            </div>
          </TabsContent>
        </TabsList>
        <TabsContent value="toptokens">
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
            {isTokensLoading ? (
              <></>
            ) : (
              <TableBody>
                {tokens.map((item: any, index: any) => (
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
                        {prc20Info?.filter(
                          (i: any) =>
                            i.tick.toLowerCase() == item.tick.toLowerCase(),
                        )[0]?.floorPrice
                          ? formatPrice(
                              prc20Info?.filter(
                                (i: any) =>
                                  i.tick.toLowerCase() ==
                                  item.tick.toLowerCase(),
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
                                  i.tick.toLowerCase() ==
                                  item.tick.toLowerCase(),
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
                ))}
              </TableBody>
            )}
          </Table>
        </TabsContent>
        <TabsContent value="mintingnow">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>#</TableHead>
                <TableHead>Tick</TableHead>
                <TableHead>% minted</TableHead>
                <TableHead>Mints (24h)</TableHead>
                <TableHead>Holders</TableHead>
                <TableHead>Deployed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody></TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </>
  );
}
