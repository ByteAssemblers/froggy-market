"use client";
import React from "react";

const colorClasses = [
  { bg: "bg-red-950", text: "text-red-500" },
  { bg: "bg-orange-950", text: "text-orange-500" },
  { bg: "bg-amber-950", text: "text-amber-500" },
  { bg: "bg-yellow-950", text: "text-yellow-500" },
  { bg: "bg-lime-950", text: "text-lime-500" },
  { bg: "bg-green-950", text: "text-green-500" },
  { bg: "bg-emerald-950", text: "text-emerald-500" },
  { bg: "bg-teal-950", text: "text-teal-500" },
  { bg: "bg-cyan-950", text: "text-cyan-500" },
  { bg: "bg-sky-950", text: "text-sky-500" },
  { bg: "bg-blue-950", text: "text-blue-500" },
  { bg: "bg-indigo-950", text: "text-indigo-500" },
  { bg: "bg-violet-950", text: "text-violet-500" },
  { bg: "bg-purple-950", text: "text-purple-500" },
  { bg: "bg-fuchsia-950", text: "text-fuchsia-500" },
  { bg: "bg-pink-950", text: "text-pink-500" },
  { bg: "bg-rose-950", text: "text-rose-500" },
];

const getColorFromText = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colorClasses.length;
  return colorClasses[index];
};

const Avatar = ({ text, xl }: { text: string; xl?: any }) => {
  const initials = text.trim().slice(0, 2).toUpperCase();
  const color = getColorFromText(text.toUpperCase());
  return (
    <div
      className={`flex ${xl ? "h-36 w-36 text-4xl" : "h-12 w-12 text-lg "} items-center justify-center rounded-md font-bold shadow-md ${color.bg} ${color.text}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;
