"use client";

import Link from "next/link";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";

export default function Footer() {
  const { marketplaceStats, isMarketplaceStatsLoading, marketplaceStatsError } =
    useProfile();

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
              href="https://x.com/_froggymarket?s=21"
              className="mx-1 flex items-center rounded-[12px] border-0 p-[0.4rem_0.6rem] text-[0.8rem] leading-none text-white transition-all duration-150 ease-in-out hover:text-[#00c853]"
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 512 512"
                height="28"
                width="28"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"></path>
              </svg>
            </Link>
            <Link
              href="https://discord.gg/ehHUsGEmFE"
              className="mx-1 flex items-center rounded-[12px] border-0 p-[0.4rem_0.6rem] text-[0.8rem] leading-none text-white transition-all duration-150 ease-in-out hover:text-[#00c853]"
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 640 512"
                height="28"
                width="28"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M524.531,69.836a1.5,1.5,0,0,0-.764-.7A485.065,485.065,0,0,0,404.081,32.03a1.816,1.816,0,0,0-1.923.91,337.461,337.461,0,0,0-14.9,30.6,447.848,447.848,0,0,0-134.426,0,309.541,309.541,0,0,0-15.135-30.6,1.89,1.89,0,0,0-1.924-.91A483.689,483.689,0,0,0,116.085,69.137a1.712,1.712,0,0,0-.788.676C39.068,183.651,18.186,294.69,28.43,404.354a2.016,2.016,0,0,0,.765,1.375A487.666,487.666,0,0,0,176.02,479.918a1.9,1.9,0,0,0,2.063-.676A348.2,348.2,0,0,0,208.12,430.4a1.86,1.86,0,0,0-1.019-2.588,321.173,321.173,0,0,1-45.868-21.853,1.885,1.885,0,0,1-.185-3.126c3.082-2.309,6.166-4.711,9.109-7.137a1.819,1.819,0,0,1,1.9-.256c96.229,43.917,200.41,43.917,295.5,0a1.812,1.812,0,0,1,1.924.233c2.944,2.426,6.027,4.851,9.132,7.16a1.884,1.884,0,0,1-.162,3.126,301.407,301.407,0,0,1-45.89,21.83,1.875,1.875,0,0,0-1,2.611,391.055,391.055,0,0,0,30.014,48.815,1.864,1.864,0,0,0,2.063.7A486.048,486.048,0,0,0,610.7,405.729a1.882,1.882,0,0,0,.765-1.352C623.729,277.594,590.933,167.465,524.531,69.836ZM222.491,337.58c-28.972,0-52.844-26.587-52.844-59.239S193.056,219.1,222.491,219.1c29.665,0,53.306,26.82,52.843,59.239C275.334,310.993,251.924,337.58,222.491,337.58Zm195.38,0c-28.971,0-52.843-26.587-52.843-59.239S388.437,219.1,417.871,219.1c29.667,0,53.307,26.82,52.844,59.239C470.715,310.993,447.538,337.58,417.871,337.58Z"></path>
              </svg>
            </Link>
            <Link
              href="https://t.me/froggymarkettg"
              className="mx-1 flex items-center rounded-[12px] border-0 p-[0.4rem_0.6rem] text-[0.8rem] leading-none text-white transition-all duration-150 ease-in-out hover:text-[#00c853]"
            >
              <svg
                stroke="currentColor"
                fill="currentColor"
                strokeWidth="0"
                viewBox="0 0 496 512"
                height="28"
                width="28"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M248,8C111.033,8,0,119.033,0,256S111.033,504,248,504,496,392.967,496,256,384.967,8,248,8ZM362.952,176.66c-3.732,39.215-19.881,134.378-28.1,178.3-3.476,18.584-10.322,24.816-16.948,25.425-14.4,1.326-25.338-9.517-39.287-18.661-21.827-14.308-34.158-23.215-55.346-37.177-24.485-16.135-8.612-25,5.342-39.5,3.652-3.793,67.107-61.51,68.335-66.746.153-.655.3-3.1-1.154-4.384s-3.59-.849-5.135-.5q-3.283.746-104.608,69.142-14.845,10.194-26.894,9.934c-8.855-.191-25.888-5.006-38.551-9.123-15.531-5.048-27.875-7.717-26.8-16.291q.84-6.7,18.45-13.7,108.446-47.248,144.628-62.3c68.872-28.647,83.183-33.623,92.511-33.789,2.052-.034,6.639.474,9.61,2.885a10.452,10.452,0,0,1,3.53,6.716A43.765,43.765,0,0,1,362.952,176.66Z"></path>
              </svg>
            </Link>
          </div>
          {!isMarketplaceStatsLoading && (
            <div>
              <div className="flex flex-row">
                <span className="w-48">24h Market Volume</span>
                <div className="flex flex-row gap-2">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  {Number(marketplaceStats.volume24h).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-row">
                <span className="w-48">Total Volume</span>
                <div className="flex flex-row gap-2">
                  <Image
                    src="/assets/coin.gif"
                    alt="coin"
                    width={18}
                    height={18}
                    priority
                    className="mb-[-0.2em] h-[1.1em] w-[1.1em]"
                  />
                  {Number(marketplaceStats.totalVolume).toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="inline-flex flex-wrap gap-x-6 text-[0.9rem] text-[#c891d8]">
            <Link href="/inscribe">Inscribe on pepinals</Link>
            <Link href="/creators">Creators dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
