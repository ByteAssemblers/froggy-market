"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export const usePepecoinPrice = () => {
  // Fetch pepecoin price
  const {
    data: pepecoinPrice,
    isLoading: isPepecoinPriceLoading,
    error: pepecoinPriceError,
  } = useQuery({
    queryKey: ["#pepecoinprice"],
    queryFn: async (): Promise<number> => {
      try {
        const response = await axios.get(
          "https://pepeblocks.com/ext/getcurrentprice",
        );
        return response.data;
      } catch (error) {
        console.error("Failed to fetch Pepecoin price:", error);
        return 0;
      }
    },
    staleTime: 60_000,
  });

  return {
    pepecoinPrice,
    isPepecoinPriceLoading,
    pepecoinPriceError,
  };
};
