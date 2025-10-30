"use client";
import { use } from "react";

import TickInfo from "@/components/page/[tick]/TickInfo";
import TickTabs from "@/components/page/[tick]/TickTabs";

export default function PRC({ params }: { params: Promise<{ tick: string }> }) {
  const { tick } = use(params);

  return (
    <>
      <TickInfo tick={tick} />
      <TickTabs tick={tick} />
    </>
  );
}
