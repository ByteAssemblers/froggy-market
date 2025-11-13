"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Avatar from "@/components/Avatar";

export default function TickTabs({ tick }: { tick: string }) {
  const [info, setInfo] = useState<any>();
  const [holders, setHolders] = useState<any[]>([]);
  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get(`/api/belindex/token?tick=${tick}`);
      setInfo(response.data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchHolders = async () => {
      const response = await axios.get(`/api/belindex/holders?tick=${tick}&page=1`);
      setHolders(response.data.holders);
    };
    fetchHolders();
  }, []);

  if (!info) {
    return <div>Loading...</div>;
  }

  return (
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
                {new Date(info.created).toLocaleString("en-GB")}
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
  );
}
