"use client";

import PepemapsInfo from "@/components/page/pepemaps/PepemapsInfo";
import PepemapsTabs from "@/components/page/pepemaps/PepemapsTabs";

export default function Pepemaps() {
  return (
    <>
      <div className="mt-4 mb-8 flex items-center">
        <h1 className="m-0 text-[2.3rem] leading-[1.1]">Pepemaps</h1>
      </div>
      <PepemapsInfo />
      <PepemapsTabs />
    </>
  );
}
