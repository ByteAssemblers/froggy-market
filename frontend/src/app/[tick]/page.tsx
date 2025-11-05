"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 

import TickInfo from "@/components/page/[tick]/TickInfo";
import TickTabs from "@/components/page/[tick]/TickTabs";

export default function PRC({ params }: { params: Promise<{ tick: string }> }) {
  const { tick } = use(params);
  const router = useRouter();
  const [isPageValid, setIsPageValid] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUrl = async () => {
      try {
        const response = await fetch(`/api/belindex/token?tick=${tick}`);
        if (response.status === 200) {
          setIsPageValid(true);
        } else if (response.status === 404) {
          setIsPageValid(false);
        }
      } catch (error) {
        console.error("Error fetching URL:", error);
        setIsPageValid(false);
      }
    };
    checkUrl();
  }, [tick]);

  if (isPageValid === null) {
    return <div>Loading...</div>; // Optional: show loading state
  }

  if (isPageValid === false) {
    router.push("/"); // Redirect to the first page if 404
    return null;
  }

  return (
    <>
      <TickInfo tick={tick} />
      <TickTabs tick={tick} />
    </>
  );
}
