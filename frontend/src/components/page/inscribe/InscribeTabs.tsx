"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { X } from "lucide-react";

import { resolveFileContentType } from "@/lib/inscription/inscribe";
import {
  PEPE_PER_KB_FEE,
  MARKET_FEE,
  RECOMMENDED_FEE,
  MAX_INSCRIPTION_SIZE,
} from "@/constants/inscription";
import { useProfile } from "@/hooks/useProfile";
import { saveJob, saveFileData, type InscriptionJob } from "@/lib/inscription/indexedDB";
import { processJob } from "@/lib/inscription/inscriptionWorker";

export default function InscribeTabs() {
  const [isInscribing, setIsInscribing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [pepePer, setPepePer] = useState<number>(PEPE_PER_KB_FEE);
  const [pepePerState, setPepePerState] = useState<"recommended" | "custom">(
    "recommended",
  );
  const [successTx, setSuccessTx] = useState<any>(null);

  const { walletInfo, wallet, isLocked, hasSavedWallet } = useProfile();

  useEffect(() => {
    walletInfo();
  }, []);

  const computeFeeRate = () => {
    const recommended = Math.max(
      1,
      Math.floor((RECOMMENDED_FEE * 1e8) / 1_000),
    );
    if (pepePerState !== "custom") return recommended;
    const custom = Number.parseFloat(String(pepePer));
    if (!Number.isFinite(custom) || custom <= 0) return recommended;
    return Math.max(1, Math.floor((custom * 1e8) / 1_000));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newTotalSize = selectedFiles.reduce(
      (acc, file) => acc + file.size,
      totalSize,
    );

    if (newTotalSize > MAX_INSCRIPTION_SIZE) {
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

  const handleInscribe = async () => {
    if (files.length === 0) {
      toast.error("Please select a file to inscribe.");
      return;
    }

    if (!hasSavedWallet) {
      toast.error("Connect your wallet before inscribing.");
      return;
    }

    if (isLocked) {
      toast.error("Unlock your wallet to inscribe.");
      return;
    }

    try {
      setIsInscribing(true);

      for (const file of files) {
        setStatusMessage("Reading file and adding to queue…");

        let payload: Uint8Array;
        try {
          const buffer = await file.arrayBuffer();
          payload = new Uint8Array(buffer);
        } catch (_readErr) {
          throw new Error(
            "Failed to read the selected file. Please try again.",
          );
        }

        const contentType = resolveFileContentType(file);
        const feeRate = computeFeeRate();

        // Create job in IndexedDB
        const job: InscriptionJob = {
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileName: file.name,
          fileSize: file.size,
          contentType,
          status: "pending",
          progress: 0,
          currentCommit: 0,
          totalCommits: 0,
          createdAt: Date.now(),
        };

        // Save job and file data to IndexedDB
        await saveJob(job);
        await saveFileData(job.id, payload);

        console.log(`📝 Job queued: ${file.name}`);
        toast.success(`${file.name} added to inscription queue!`);

        // Process the job immediately
        setStatusMessage(`Inscribing ${file.name}...`);

        try {
          const result = await processJob(
            job.id,
            wallet,
            feeRate,
            (update: Partial<InscriptionJob>) => {
              // Update UI with progress
              if (update.currentCommit && update.totalCommits) {
                setStatusMessage(
                  `Processing commit ${update.currentCommit}/${update.totalCommits}...`
                );
              }
            }
          );

          setStatusMessage("Inscription complete.");
          setSuccessTx({ commitTxid: result.commitTxid, revealTxid: result.revealTxid });

          toast.success(`${file.name} inscribed successfully!`);
          console.log(`✅ Inscription complete: ${result.revealTxid}`);
        } catch (error: any) {
          // Job failed - error is already saved in IndexedDB
          console.error(`❌ Failed to inscribe ${file.name}:`, error);
          toast.error(`Failed to inscribe ${file.name}: ${error.message}`);
        }
      }

      // Clear files after processing
      setFiles([]);
      setTotalSize(0);
      setStatusMessage("");
    } catch (error: any) {
      console.error("Inscription failed", error);
      setStatusMessage("");
      toast.error(error?.message || "Failed to inscribe. Please try again.");
    } finally {
      setIsInscribing(false);
    }
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
                    className="w-10 rounded-md bg-transparent text-white focus:ring-0 focus:outline-none"
                  />
                  <span className="ml-2">pepe/kB</span>
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

      {isInscribing && (
        <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 p-4">
          <div className="text-sm text-green-200">
            ✅ <strong>Your inscription is being saved automatically!</strong>
            <br />
            You can safely refresh the page or close the browser - the inscription will automatically resume when you return.
            <br />
            <br />
            💡 <strong>Tip:</strong> You can navigate to other pages while inscribing. Check the bottom-right corner to see progress after page refresh.
          </div>
        </div>
      )}

      <Button
        className="font-inherit rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
        onClick={handleInscribe}
        disabled={isInscribing}
      >
        {isInscribing ? statusMessage : "Inscribe"}
      </Button>

      {successTx && (
        <div>
          <div>
            Transaction successful!
            <br />
            Commit TXID: {successTx.commitTxid}
            <br />
            Reveal TXID: {successTx.revealTxid}
          </div>
        </div>
      )}
    </>
  );
}
