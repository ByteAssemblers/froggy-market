"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "../ui/skeleton";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

export default function Collections() {
  const [nfts, setNfts] = useState<any[]>([]);
  const {
    collections,
    isCollectionsLoading,
    collectionsError,
    collectionInfo,
    isCollectionInfoLoading,
    collectionInfoError,
  } = useProfile();

  useEffect(() => {
    if (collections && !isCollectionsLoading) {
      setNfts(collections);
    }
  }, [collections, isCollectionsLoading]);

  return (
    <>
      <h2 className="mt-8 mb-6 text-[1.6rem] leading-[1.1] font-bold text-[#00c853]">
        Collections
      </h2>
      <div className="col:grid col:grid-flow-col col:grid-rows-5 gap-x-4">
        {isCollectionsLoading || isCollectionInfoLoading ? (
          [...Array(9)].map((_, i) => (
            <Skeleton
              key={i}
              className="mb-1 flex h-22 grow items-center rounded-[12px] bg-transparent px-4 py-3 text-white transition-all duration-150 ease-in-out"
            >
              <div className="min-w-[0.7rem] text-[1.2rem] font-bold">
                {1 + i}
              </div>
              <div className="relative mx-[1.4rem] my-0 shrink-0">
                <div className="image-pixelated h-16 w-16 rounded-full bg-[#4c505c33] object-cover" />
              </div>
              <div>
                <div className="mb-1 max-w-[18rem] text-[1.2rem] leading-[1.2] font-semibold">
                  ----
                </div>
                <div className="flex text-[0.9rem] leading-[1.2] font-normal text-[#fffc]">
                  Floor price:&#xA0;
                  <span className="flex font-medium whitespace-nowrap text-[#fffffff2]">
                    <Image
                      src="/assets/coin.gif"
                      alt="coin"
                      width={16}
                      height={16}
                      priority
                      className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                    />
                    --
                  </span>
                </div>
              </div>
              <div className="ml-auto flex pl-6 whitespace-nowrap">
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
            </Skeleton>
          ))
        ) : (
          <>
            {nfts.slice(0, 9).map((item, index) => (
              <Link
                key={index}
                href={`/nfts/${item.symbol}`}
                className="flex grow items-center rounded-[12px] px-4 py-3 text-white transition-all duration-150 ease-in-out hover:bg-[#1D1E20]"
              >
                <div className="min-w-[0.7rem] text-[1.2rem] font-bold">
                  {index + 1}
                </div>
                <div className="relative mx-[1.4rem] my-0 shrink-0">
                  <Image
                    src={`${ORD_API_BASE}/content/${item.profileInscriptionId}`}
                    alt={`Inscription #${item.profileInscriptionId}`}
                    width={64}
                    height={64}
                    className="image-pixelated h-16 w-16 rounded-full bg-[#212121] object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <div className="mb-1 max-w-[18rem] text-[1.2rem] leading-[1.2] font-semibold">
                    {item.name}
                  </div>
                  <div className="flex text-[0.9rem] leading-[1.2] font-normal text-[#fffc]">
                    Floor price:&#xA0;
                    <span className="flex font-medium whitespace-nowrap text-[#fffffff2]">
                      <Image
                        src="/assets/coin.gif"
                        alt="coin"
                        width={16}
                        height={16}
                        priority
                        className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                      />
                      {
                        collectionInfo?.filter(
                          (i: any) => i.symbol == item.symbol,
                        )[0]?.floorPrice
                      }
                      &#xA0;
                      {collectionInfo?.filter(
                        (i: any) => i.symbol == item.symbol,
                      )[0]?.change24h == 0 && <></>}
                      {collectionInfo?.filter(
                        (i: any) => i.symbol == item.symbol,
                      )[0]?.change24h > 0 && (
                        <span className="flex text-[0.8rem] text-[#00FF7F]">
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
                            <span>
                              {Number(
                                collectionInfo?.filter(
                                  (i: any) => i.symbol == item.symbol,
                                )[0]?.change24h,
                              ).toFixed(2)}
                              %
                            </span>
                          </span>
                        </span>
                      )}
                      {collectionInfo?.filter(
                        (i: any) => i.symbol == item.symbol,
                      )[0]?.change24h < 0 && (
                        <span className="flex text-[0.8rem] text-[#ff6347]">
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
                            <span>
                              {
                                -Number(
                                  collectionInfo?.filter(
                                    (i: any) => i.symbol == item.symbol,
                                  )[0]?.change24h,
                                ).toFixed(2)
                              }
                              %
                            </span>
                          </span>
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                <div className="ml-auto flex pl-6 whitespace-nowrap">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  {
                    collectionInfo?.filter(
                      (i: any) => i.symbol == item.symbol,
                    )[0]?.volume24h
                  }
                </div>
              </Link>
            ))}
          </>
        )}
        <Link
          href="/nfts"
          className="flex items-center justify-center rounded-[12px] px-4 py-3 font-bold text-[#fbb9fb] transition-all duration-150 ease-in-out hover:bg-[#1D1E20] hover:text-[violet]"
        >
          <div className="flex h-16 items-center">Show all collections</div>
        </Link>
      </div>
    </>
  );
}
