"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Image from "next/image";

const database = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  name: `Pepinal Mini Pepes #${i + 1}`,
  urlname: "minipepes",
  floorprice: Math.floor(Math.random() * 900) + 100, // 100–1000
  twentyfourhourvolume: Math.floor(Math.random() * 10000) + 500, // 500–10,000
  totalvolume: Math.floor(Math.random() * 50000000) + 100000, // 100k–50M
  trades: Math.floor(Math.random() * 50) + 1, // 1–50
  items: Math.floor(Math.random() * 10000) + 1000, // 1k–10k
  owners: Math.floor(Math.random() * 3000) + 500, // 500–3k
  imageurl: `https://api.doggy.market/static/drc-20/dogi.png`,
  verify: Math.random() > 0.3, // 70% chance true
}));

export default function nfts() {
  const router = useRouter();

  const [collections, setCollections] = useState<any[]>([]);
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await fetch(`http://localhost:5555/api/collections`);
        const data = await response.json();
        setCollections(data);
      } catch (error) {
        console.error("Failed to fetch collections:", error);
      }
    };

    fetchCollections();
  }, []);

  console.log(collections);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="m-0 text-[1.6rem] leading-[1.1]">Collections</h2>
        <div></div>
        <button></button>
      </div>
      <div className="px-2.0 w-full overflow-x-auto">
        <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
          <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
            <TableRow className="">
              <TableHead>#</TableHead>
              <TableHead>&#xA0;&#xA0;&#xA0;&#xA0;&#xA0;</TableHead>
              <TableHead>Collection name</TableHead>
              <TableHead>Floor price</TableHead>
              <TableHead>Volume (24h)</TableHead>
              <TableHead>Total volume</TableHead>
              <TableHead>Trades (24h)</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Owners</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((item, index) => (
              <TableRow
                key={index}
                className="cursor-pointer text-[16px] text-white transition-all duration-150 ease-in-out"
                onClick={() => router.push(`/nfts/${item.symbol}`)}
              >
                <TableCell className="w-auto rounded-tl-[12px] rounded-bl-[12px] px-3 py-4 align-middle font-bold">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="relative mx-[1.4rem] my-0 shrink-0">
                    <Image
                      src={`http://localhost:7777/content/${item.profileInscriptionId}`}
                      alt={`Inscription #${item.profileInscriptionId}`}
                      width={42}
                      height={42}
                      className="h-[42px] w-[42px] rounded-full object-cover align-middle"
                      unoptimized
                    />
                  </div>
                </TableCell>
                <TableCell>{item.name}</TableCell>
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
                    {/* {item.floorprice.toLocaleString()} */}
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
                    {/* {item.twentyfourhourvolume.toLocaleString()} */}
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
                    {/* {item.totalvolume.toLocaleString()} */}
                  </div>
                </TableCell>
                <TableCell>{/* {item.trades.toLocaleString()} */}</TableCell>
                <TableCell>{/* {item.items.toLocaleString()} */}</TableCell>
                <TableCell>{/* {item.owners.toLocaleString()} */}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
