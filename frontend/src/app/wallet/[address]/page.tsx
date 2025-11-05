"use client";
import { use, useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EllipsisVertical, Filter } from "lucide-react";
import { decryptWallet } from "@/lib/wallet/storage";

export default function WalletAddress({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const [hasSavedWallet, setHasSavedWallet] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [wallet, setWallet] = useState<any>(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [inscriptions, setInscriptions] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("pepecoin_wallet");

    if (stored) {
      const parsed = JSON.parse(stored);
      setHasSavedWallet(true);

      if (parsed.passwordProtected) {
        setIsLocked(true);
      } else {
        decryptWallet(parsed, "")
          .then((w) => {
            setWallet(w);
            setWalletAddress(w.address);
          })
          .catch(() => console.error("Auto-unlock failed"));
      }
    }
  }, []);

  useEffect(() => {
    const fetchWallet = async () => {
      let page = 1;
      let allInscriptions: any = [];
      let continueFetching = true;

      while (continueFetching) {
        const response = await fetch(
          `http://localhost:7777/inscriptions/balance/${address}/${page}`,
        );
        const data = await response.json();

        if (data.inscriptions && data.inscriptions.length > 0) {
          // Add the new inscriptions to the list
          allInscriptions = [...allInscriptions, ...data.inscriptions];

          // Move to the next page
          page++;
        } else {
          // Stop if no more inscriptions are found
          continueFetching = false;
        }
      }

      // Sort inscriptions by timestamp in descending order
      allInscriptions.sort((a: any, b: any) => b.timestamp - a.timestamp);

      // Update the state with the sorted inscriptions
      setInscriptions(allInscriptions);
    };

    fetchWallet();
  }, []);

  return (
    <>
      <h1 className="leading-[1.1 ] text-3xl">
        {walletAddress === address ? "My wallet" : address}
      </h1>
      <Tabs defaultValue="nfts" className="relative">
        <TabsList className="my-4 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
          <div className="my-2 flex list-none gap-5 overflow-x-auto p-0 select-none">
            <TabsTrigger value="prc" className="text-md">
              PRC-20
            </TabsTrigger>
            <TabsTrigger value="nfts" className="text-md">
              NFTs
            </TabsTrigger>
            <TabsTrigger value="pepemaps" className="text-md">
              Pepemaps
            </TabsTrigger>
            <TabsTrigger value="history" className="text-md">
              History
            </TabsTrigger>
            <TabsContent
              value="nfts"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
            <TabsContent
              value="pepemaps"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <Filter />
              </button>
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
            <TabsContent
              value="history"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
          </div>
        </TabsList>
        <TabsContent value="prc">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead></TableHead>
                <TableHead>Tick</TableHead>
                <TableHead>Total balance</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Inscribed</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              {[...Array(20)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="w-auto px-0 text-center">
                    <Link href="/dxcn">
                      <div className="m-auto flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#212121] object-cover align-middle text-[0.7rem] select-none">
                        dxcn
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href="/dxcn">dxcn</Link>
                  </TableCell>
                  <TableCell>1,507,100,000,000</TableCell>
                  <TableCell>1,507,100,000,000</TableCell>
                  <TableCell>0</TableCell>
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
                      587.77
                    </div>
                    <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                      $119.90
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <h2 className="mt-16 mb-5 text-2xl leading-[1.1]">Activity</h2>
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
                  <TableCell>receive</TableCell>
                  <TableCell>damm</TableCell>
                  <TableCell>1000</TableCell>
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
                    15.12.2023
                    <br />
                    23:24:54
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="nfts">
          <div className="relative flex">
            <div className="relative grow overflow-hidden">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-5">
                {inscriptions.map((item, index) => (
                  <div
                    key={index}
                    className="relative flex flex-col items-center overflow-hidden rounded-xl border-2 border-transparent bg-[#4c505c33] p-4 text-center transition-all duration-150 ease-in-out"
                  >
                    <div className="flex h-32 w-32 items-center justify-center">
                      <Link
                        href={`/inscription/${item.inscription_id}`}
                        className="h-full w-full"
                      >
                        <Image
                          src={`http://localhost:7777/content/${item.inscription_id}`}
                          alt="nft"
                          width={128}
                          height={128}
                          className="pointer-events-none h-full max-h-32 w-auto max-w-32 rounded-xl bg-[#444] object-contain text-[0.8rem] select-none"
                          unoptimized
                        />
                      </Link>
                    </div>
                    <div className="my-1.5 flex w-full justify-center text-[1.1rem] leading-[1.2]">
                      <span></span>
                      <span className="ml-4"></span>
                    </div>
                    <div className="mt-auto w-full border-t border-white/10 py-2">
                      <div className="text-[0.9rem] text-[#dfc0fd] hover:text-[#c891ff]">
                        <Link href={`/inscription/${item.inscription_id}`}>
                          #{item.inscription_number}
                        </Link>
                      </div>
                    </div>
                    {walletAddress === address && (
                      <div className="flex w-full gap-2.5">
                        <button className="font-inherit inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-[#263340] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out">
                          <svg
                            data-v-51cc9e0e=""
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            width="20"
                            height="20"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M3 11.172V5a2 2 0 0 1 2-2h6.172a2 2 0 0 1 1.414.586l8 8a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0l-8-8A2 2 0 0 1 3 11.172zM7 7h.001"
                            ></path>
                          </svg>
                          <span className="ml-2">List</span>
                        </button>
                        <button className="font-inherit inline-flex grow-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#3c1295] px-4 py-2 text-base font-bold text-[#d94fff] transition-all duration-200 ease-in-out">
                          <svg
                            data-v-51cc9e0e=""
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            width="20"
                            height="20"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="m6 12-3 9 18-9L3 3l3 9zm0 0h6"
                            ></path>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="pepemaps">
          <div className="flex justify-center">no pepemaps on this wallet</div>
        </TabsContent>
        <TabsContent value="history">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>Item</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              <TableRow>
                <TableCell>nothing to show</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </>
  );
}
