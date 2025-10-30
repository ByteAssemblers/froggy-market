"use client";

import Link from "next/link";
import Image from "next/image";

import SearchBar from "@/components/SearchBar";
import Wallet from "@/components/Wallet";

export default function Header() {
  return (
    <div className="sticky top-0 z-9999 flex w-full justify-center px-4 py-6">
      <div className="tiny:gap-4 flex w-full max-w-[1200px] gap-2">
        <Link
          href="/"
          className="tiny:px-4 -mt-[0.7rem] -mb-[0.7rem] flex shrink-0 items-center"
        >
          <Image
            src="assets/Logo.png"
            alt="logo"
            width={40}
            height={40}
            className="tiny:w-16 tiny:h-16"
            unoptimized
          />
        </Link>
        <SearchBar />
        <Wallet />
      </div>
    </div>
  );
}
