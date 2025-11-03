"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { X } from "lucide-react";

export default function InscribeTabs() {
  const PEPE_PER_KB_FEE = 0.042;
  const MARKET_FEE = 2;

  const [files, setFiles] = useState<File[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [pepePer, setPepePer] = useState<number>(PEPE_PER_KB_FEE);
  const [pepePerState, setPepePerState] = useState<"recommended" | "custom">(
    "recommended",
  );
  const [loading, setLoading] = useState(false); // Track loading state

  const MAX_SIZE = 1 * 1024 * 1024; // Max file size: 1MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newTotalSize = selectedFiles.reduce(
      (acc, file) => acc + file.size,
      totalSize,
    );

    if (newTotalSize > MAX_SIZE) {
      toast.error("Total file size exceeds 1MB. Please select smaller files.");
    } else {
      setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
      setTotalSize(newTotalSize);
    }
  };

  const handleRemoveFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    const newTotalSize = updatedFiles.reduce((acc, file) => acc + file.size, 0);
    setTotalSize(newTotalSize);
  };

  return (
    <>
      <Toaster />

      <div className="relative">
        <div className="relative mb-6 min-w-[20rem] rounded-[12px] border-2 border-dashed border-[#696969] bg-[#222] p-8 text-center">
          <div>Click to select files, or drop your files here</div>
          <div className="text-[0.9rem] text-[#ffffffe6]">
            Maximum 2500 files, if you want to inscribe more please split them
            into few batches.
          </div>
        </div>
        <input
          type="file"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={handleFileSelect}
        />
      </div>

      {files.length > 0 && (
        <div className="mb-6">
          <div className="mb-4">{files.length} files</div>
          <div className="flex max-h-80 flex-col gap-y-2 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-x-4 rounded-xl bg-[#202020] px-4 py-2"
              >
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">
                  {file.name}
                </div>
                <div className="text-[0.9rem] text-[#ffffffe6]">
                  {file.type}
                </div>
                <X
                  onClick={() => handleRemoveFile(index)}
                  className="ml-auto cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-2">Network fee:</div>
        <div className="inline-flex gap-6">
          {pepePerState === "recommended" && (
            <>
              <div className="flex flex-col items-center justify-center rounded-[12px] border border-white/20 p-3 px-4 outline-1 outline-white/20">
                <div>Recommended</div>
                <div className="text-[0.9rem] text-[#fffc]">
                  {PEPE_PER_KB_FEE} pepe/kB
                </div>
              </div>
              <label
                onClick={() => {
                  setPepePerState("custom");
                  setPepePer(0);
                }}
                className="flex flex-col items-center justify-center rounded-xl border border-white/20 px-4 py-3"
              >
                Custom
              </label>
            </>
          )}
          {pepePerState === "custom" && (
            <>
              <div
                onClick={() => setPepePerState("recommended")}
                className="flex flex-col items-center justify-center rounded-[12px] border border-white/20 p-3 px-4"
              >
                <div>Recommended</div>
                <div className="text-[0.9rem] text-[#fffc]">
                  {PEPE_PER_KB_FEE} pepe/kB
                </div>
              </div>
              <label className="flex flex-col items-center justify-center rounded-xl border border-white/20 px-4 py-3 outline-1 outline-white/20">
                <div>Custom</div>
                <div className="text-[0.9rem] text-[#fffc]">
                  <input
                    type="number"
                    value={pepePer}
                    onChange={(e) => setPepePer(Number(e.target.value))}
                    placeholder={String(PEPE_PER_KB_FEE)}
                    className="w-11 rounded-md bg-transparent text-white focus:ring-0 focus:outline-none"
                  />
                  <span>pepe/kB</span>
                </div>
              </label>
            </>
          )}
        </div>
        <div className="mt-6 flex">
          Estimated fee: ~&#xA0;
          <Image
            src="/assets/coin.gif"
            alt="coin"
            width={18}
            height={18}
            priority
            className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
          />
          {files.length
            ? files.length * (MARKET_FEE + (pepePer * totalSize) / 1024)
            : 0}
        </div>
      </div>

      <Button
        className="font-inherit rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
        disabled={loading} // Disable the button when the transaction is being processed
      >
        {loading ? "Inscribing..." : "Inscribe"}
      </Button>
    </>
  );
}
