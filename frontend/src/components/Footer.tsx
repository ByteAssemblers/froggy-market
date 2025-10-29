"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <div className="flex w-full justify-center border-t border-[#454545] bg-[#0a0a0a] py-4">
      <div className="mx-4 w-full max-w-[1200px] text-[#eaeaea]">
        <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
          <div className="flex items-center">
            <Image
              src="/assets/Logo.png"
              alt="logo"
              width={32}
              height={32}
              priority
            />
            <div className="mr-6 ml-4 text-[1.2rem] leading-[1.2] font-semibold">
              <span>Froggy</span>
              <span className="ml-[0.25em]">Market</span>
            </div>
            <Link
              href="https://twitter.com/pepecoin"
              className="mx-1 flex items-center rounded-[12px] border-0 p-[0.4rem_0.6rem] text-[0.8rem] leading-none text-white transition-all duration-150 ease-in-out"
            >
              <span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </span>
              <span className="ml-[0.3rem]">Twitter</span>
            </Link>
            <Link
              href="https://t.me/pepecoin"
              className="mx-1 flex items-center rounded-[12px] border-0 p-[0.4rem_0.6rem] text-[0.8rem] leading-none text-white transition-all duration-150 ease-in-out"
            >
              <span>
                <svg
                  data-v-22f1ed45=""
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                >
                  <path
                    stroke="currentColor"
                    strokeWidth="3"
                    d="M40.83,8.48c1.14,0,2,1,1.54,2.86l-5.58,26.3c-.39,1.87-1.52,2.32-3.08,1.45L20.4,29.26a.4.4,0,0,1,0-.65L35.77,14.73c.7-.62-.15-.92-1.07-.36L15.41,26.54a.46.46,0,0,1-.4.05L6.82,24C5,23.47,5,22.22,7.23,21.33L40,8.69a2.16,2.16,0,0,1,.83-.21Z"
                  ></path>
                </svg>
              </span>
              <span className="ml-[0.3rem]">Telegram</span>
            </Link>
          </div>
          <div className="inline-flex flex-wrap gap-x-6 text-[0.9rem] text-[#c891d8]">
            <Link href="/inscribe">Inscribe on doginals</Link>
            <Link href="/creators">Creators dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
