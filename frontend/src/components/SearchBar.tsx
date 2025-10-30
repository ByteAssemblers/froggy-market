"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import { Search } from "lucide-react";

export default function SearchBar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  
  return (
    <Popover open={searchOpen} onOpenChange={setSearchOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full backdrop-blur-[20px]">
          <InputGroup className="flex h-11 cursor-text items-center border-transparent bg-[#ffffff1f] p-2 leading-[26px]">
            <InputGroupInput
              id="search"
              name="search"
              placeholder="Search for tokens, collections, wallets & inscriptions"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            <InputGroupAddon className="">
              <Search className="" />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start">
        <div className="visible z-9990 mt-2 max-w-[calc(100vw-10px)]">
          <div className="transition-visibility relative flex w-(--radix-popover-trigger-width) flex-col overflow-y-auto overscroll-contain rounded-xl bg-[#ffffff1a] p-2 leading-[1.4] whitespace-normal text-white backdrop-blur-[42px] transition-transform duration-200 outline-none">
            <div className="text-[0.9rem] font-medium">Tokens</div>
            {[...Array(5)].map((_, i) => (
              <Link
                key={i}
                href="/ddex"
                className="mb-1.0 flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2 leading-[1.2] font-medium text-inherit no-underline hover:bg-[#0004]"
                onClick={() => setSearchOpen(false)}
              >
                <Image
                  src="https://doggy.market/drc-20/ddex.jpg"
                  alt="ddex"
                  width={42}
                  height={42}
                  className="shrink-0 grow-0 basis-[42px] rounded-full object-cover"
                  unoptimized
                />
                <div className="grow">
                  <div className="font-semibold">ddex</div>
                  <div className="text-[0.9rem] font-normal text-[#fffc]">
                    523 holders
                  </div>
                </div>
                <div>
                  <div className="flex text-right whitespace-nowrap">
                    <Image
                      src="/assets/coin.gif"
                      alt="coin"
                      width={18}
                      height={18}
                      priority
                      className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                    />
                    0.033
                  </div>
                  <div className="text-right text-[0.9rem]">0%</div>
                </div>
              </Link>
            ))}
            <div className="text-[0.9rem] font-medium">Collections</div>
            {[...Array(5)].map((_, i) => (
              <Link
                key={i}
                href="/ddex"
                className="mb-1.0 flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-2 leading-[1.2] font-medium text-inherit no-underline hover:bg-[#0004]"
              >
                <Image
                  src="https://doggy.market/drc-20/ddex.jpg"
                  alt="ddex"
                  width={42}
                  height={42}
                  className="shrink-0 grow-0 basis-[42px] rounded-full object-cover"
                  unoptimized
                />
                <div className="grow">
                  <div className="font-semibold">ddex</div>
                  <div className="text-[0.9rem] font-normal text-[#fffc]">
                    10,000 items
                  </div>
                </div>
                <div>
                  <div className="flex text-right whitespace-nowrap">
                    <Image
                      src="/assets/coin.gif"
                      alt="coin"
                      width={18}
                      height={18}
                      priority
                      className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                    />
                    0.033
                  </div>
                  <div className="text-right text-[0.9rem]">0%</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
