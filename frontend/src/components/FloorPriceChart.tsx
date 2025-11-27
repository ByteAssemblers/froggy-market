"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface FloorPriceChartProps {
  data?: Array<{ date: Date; floorPrice: number }>;
  isLoading?: boolean;
}

export function FloorPriceChart({ data, isLoading }: FloorPriceChartProps) {
  // Transform data from backend format to chart format
  const chartData =
    data?.map((item) => ({
      date: item.date,
      price: item.floorPrice,
    })) || [];

  if (isLoading) {
    return (
      <div className="h-80 w-full">
        <Skeleton className="h-full w-full bg-[#4c505c33]" />
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-80 w-full items-center justify-center text-white/75">
        No floor price data available
      </div>
    );
  }

  return (
    <div className="mt-4 h-80 w-full">
      <ChartContainer
        className="h-full w-full"
        config={{
          price: {
            label: "Floor Price:\u00A0",
            color: "#d946ef",
          },
        }}
      >
        {/* <ResponsiveContainer width="100%" height="100%"> */}
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d946ef" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#d946ef" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: "#aaa", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#aaa", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <ChartTooltip
            cursor={{ stroke: "#333", strokeWidth: 1 }}
            content={<ChartTooltipContent />}
          />
          <Area
            type="step"
            dataKey="price"
            stroke="#d946ef"
            fill="url(#fillPrice)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
        {/* </ResponsiveContainer> */}
      </ChartContainer>
    </div>
  );
}
