"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";
import { X, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { blockchainClient } from "@/lib/axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;
import { resolveFileContentType } from "@/lib/inscription/inscribe";
import {
  PEPE_PER_KB_FEE,
  RECOMMENDED_FEE,
  MAX_INSCRIPTION_SIZE,
} from "@/constants/inscription";
import { useProfile } from "@/hooks/useProfile";
import {
  saveJob,
  saveFileData,
  getAllJobs,
  type InscriptionJob,
} from "@/lib/inscription/indexedDB";
import { processJob } from "@/lib/inscription/inscriptionWorker";
import { Spinner } from "@/components/ui/spinner";
import {
  splitPartialForScriptSig,
  buildPepinalsPartial,
} from "@/lib/inscription/inscribe";
import { Textarea } from "@/components/ui/textarea";

export default function Inscribe() {
  const [isInscribing, setIsInscribing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [pepePer, setPepePer] = useState<number>(PEPE_PER_KB_FEE);
  const [pepePerState, setPepePerState] = useState<"recommended" | "custom">(
    "recommended",
  );
  // Text
  const [textInput, setTextInput] = useState("");

  // Prc-20 state
  const [prcState, setPrcState] = useState<"" | "deploy" | "mint" | "transfer">(
    "",
  );

  // DEPLOY
  const [deployTick, setDeployTick] = useState("");
  const [deployMax, setDeployMax] = useState("");
  const [deployLim, setDeployLim] = useState("");
  const [deployDec, setDeployDec] = useState("18");

  // MINT
  const [mintTick, setMintTick] = useState("");
  const [mintAmt, setMintAmt] = useState("");

  // TRANSFER
  const [transferTick, setTransferTick] = useState("");
  const [transferAmt, setTransferAmt] = useState("");

  // Pepemap
  const [startNumber, setStartNumber] = useState("");
  const [endNumber, setEndNumber] = useState("");

  const [successTx, setSuccessTx] = useState<any>(null);
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<number>(0);
  const { walletInfo, walletAddress, isLocked, hasSavedWallet, wallet } =
    useProfile();

  const toggleExpanded = (index: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  useEffect(() => {
    walletInfo();
  }, []);

  // Calculate real estimated fee when files change
  useEffect(() => {
    const calculateRealFee = async () => {
      if (files.length === 0) {
        setEstimatedFee(0);
        return;
      }

      try {
        // Import crypto libraries dynamically to ensure they're loaded
        const { ensureCryptoReady } = await import(
          "@/lib/inscription/inscribe"
        );
        await ensureCryptoReady();

        let totalFee = 0;
        const feeRate = computeFeeRate();

        for (const file of files) {
          const buffer = await file.arrayBuffer();
          const payload = new Uint8Array(buffer);
          const contentType = resolveFileContentType(file);

          // Build partial and split into segments
          const partial = buildPepinalsPartial(contentType, payload);
          const segments = splitPartialForScriptSig(partial);

          // Calculate fee for this file
          // Each commit transaction: ~200 bytes base + segment size
          // Each segment transaction fee
          const commitFees = segments.length * 200 * feeRate; // Base tx size * fee rate

          // Reveal transaction: ~300 bytes
          const revealFee = 300 * feeRate;

          // Total for this file (in sats)
          const fileFee = (commitFees + revealFee) / 100000000; // Convert to PEP
          totalFee += fileFee;
        }

        setEstimatedFee(totalFee);
      } catch (error) {
        console.error("Failed to calculate fee:", error);
        setEstimatedFee(0);
      }
    };

    calculateRealFee();
  }, [files, pepePer, pepePerState]);

  const fetchInscriptions = async () => {
    setIsLoading(true);
    // console.log("🔍 fetchInscriptions called:", {
    //   walletAddress,
    //   isLocked,
    //   wallet: wallet ? "exists" : "null",
    // });

    // Only fetch inscriptions if wallet is unlocked
    if (!walletAddress || isLocked) {
      console.log("⛔ Cannot fetch: wallet locked or no address");
      setInscriptions([]);
      setIsLoading(false);
      return;
    }

    console.log("🔄 Fetching inscription history for:", walletAddress);

    try {
      // 1. Get active jobs from IndexedDB
      const activeJobs = await getAllJobs();
      const myActiveJobs = activeJobs.filter(
        (job) => job.status === "processing" || job.status === "pending",
      );

      // 2. Fetch completed inscriptions from API
      let page = 1;
      let allInscriptions: any = [];
      let continueFetching = true;

      while (continueFetching) {
        const url = `/inscriptions/balance/${walletAddress}/${page}`;
        console.log(`📡 Fetching page ${page}:`, ORD_API_BASE + url);

        try {
          const response = await blockchainClient.get(url);
          const data = response.data;
          console.log(`📦 Page ${page} response:`, data);

          if (data.inscriptions && data.inscriptions.length > 0) {
            // Add the new inscriptions to the list
            allInscriptions = [...allInscriptions, ...data.inscriptions];

            // Move to the next page
            page++;
          } else {
            // Stop if no more inscriptions are found
            continueFetching = false;
          }
        } catch (error: any) {
          console.error(`❌ HTTP Error:`, error.message);
          throw new Error(`Failed to fetch inscriptions: ${error.message}`);
        }
      }

      // 3. Merge active jobs with completed inscriptions
      const mergedList = [
        ...myActiveJobs.map((job) => ({
          ...job,
          isActiveJob: true, // Flag to identify active jobs
        })),
        ...allInscriptions,
      ];

      // Sort by timestamp/createdAt in descending order
      mergedList.sort((a: any, b: any) => {
        const aTime = a.timestamp || a.createdAt / 1000;
        const bTime = b.timestamp || b.createdAt / 1000;
        return bTime - aTime;
      });

      // Update the state with the merged list
      setInscriptions(mergedList);
      console.log(
        `✅ Loaded ${allInscriptions.length} completed + ${myActiveJobs.length} active inscriptions`,
      );
      setIsLoading(false);
    } catch (error) {
      console.error("❌ Failed to fetch inscriptions:", error);
      setInscriptions([]);
      setIsLoading(false);
    }
  };

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

  // Helper function to process a single inscription
  const processInscription = async (file: {
    name: string;
    size: number;
    type: string;
    arrayBuffer: () => Promise<ArrayBuffer>;
  }) => {
    let payload: Uint8Array;
    try {
      const buffer = await file.arrayBuffer();
      payload = new Uint8Array(buffer);
    } catch (_readErr) {
      throw new Error("Failed to read the selected file. Please try again.");
    }

    const contentType = resolveFileContentType(file);
    const feeRate = computeFeeRate();

    // Create job in IndexedDB
    const job: InscriptionJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      fileName: file.name,
      fileSize: file.size,
      contentType,
      status: "processing",
      progress: 0,
      currentCommit: 0,
      totalCommits: 0,
      createdAt: Date.now(),
    };

    // Save job and file data to IndexedDB
    await saveJob(job);
    await saveFileData(job.id, payload);

    console.log(`📝 Job saved to IndexedDB: ${file.name} (ID: ${job.id})`);

    // Process the job and AWAIT completion
    await processJob(
      job.id,
      wallet,
      feeRate,
      (update: Partial<InscriptionJob>) => {
        console.log("📊 Progress update:", update);
        // Update UI with progress
        if (update.currentCommit && update.totalCommits) {
          setStatusMessage(
            `Processing commit ${update.currentCommit}/${update.totalCommits}...`,
          );
        }
        // Refresh history to show progress updates
        fetchInscriptions();
      },
    );

    console.log(`✅ Inscription complete for ${file.name}`);
  };

  const handleInscribe = async () => {
    const hasTextInput = textInput.trim().length > 0;
    const hasPepemapInput = startNumber.trim().length > 0;

    if (files.length === 0 && !hasTextInput && !hasPepemapInput) {
      toast.error("Please input text, select a file, or enter pepemap numbers.");
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

    // Check if there's already an active inscription
    const activeJobs = await getAllJobs();
    const hasActiveJob = activeJobs.some(
      (job) => job.status === "processing" || job.status === "pending",
    );

    if (hasActiveJob) {
      toast.error("Please wait for the current inscription to complete.");
      return;
    }

    try {
      setIsInscribing(true);

      // PEPEMAP mode
      if (hasPepemapInput) {
        const start = parseInt(startNumber);
        const end = endNumber.trim().length > 0 ? parseInt(endNumber) : null;

        // Validate numbers
        if (isNaN(start) || start < 0) {
          toast.error("Please enter a valid start number.");
          setIsInscribing(false);
          return;
        }

        if (end !== null && (isNaN(end) || end < start)) {
          toast.error("End number must be greater than or equal to start number.");
          setIsInscribing(false);
          return;
        }

        // Generate pepemap contents
        const pepemapNumbers = end !== null
          ? Array.from({ length: end - start + 1 }, (_, i) => start + i)
          : [start];

        // Process each pepemap inscription sequentially
        for (let i = 0; i < pepemapNumbers.length; i++) {
          const num = pepemapNumbers[i];
          const content = `${num}.pepemap`;
          const blob = new Blob([content], { type: "text/plain" });

          const file = {
            name: `${num}.pepemap`,
            size: blob.size,
            type: "text/plain",
            arrayBuffer: () => blob.arrayBuffer(),
          };

          setStatusMessage(
            `Inscribing pepemap ${i + 1}/${pepemapNumbers.length}: ${num}.pepemap`
          );

          await processInscription(file);

          // Small delay between inscriptions
          if (i < pepemapNumbers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        toast.success(`Successfully inscribed ${pepemapNumbers.length} pepemap file(s)!`);
        setStartNumber("");
        setEndNumber("");
        setStatusMessage("");
        fetchInscriptions();
        setIsInscribing(false);
        return;
      }

      let file: {
        name: string;
        size: number;
        type: string;
        arrayBuffer: () => Promise<ArrayBuffer>;
      };

      if (files.length > 0) {
        // Existing file mode
        file = files[0];
        setStatusMessage("Reading file and adding to queue…");
      } else {
        // New TEXT mode — convert text to a virtual file
        const blob = new Blob([textInput], { type: "text/plain" });

        file = {
          name: "text.txt",
          size: blob.size,
          type: "text/plain",
          arrayBuffer: () => blob.arrayBuffer(),
        };

        setStatusMessage("Preparing text and adding to queue…");
      }

      toast.success(`${file.name} started inscribing!`);

      // Clear files after queuing
      setFiles([]);
      setTotalSize(0);

      // Trigger history refresh to show the new job immediately
      fetchInscriptions();

      // Process the inscription
      await processInscription(file);

      setStatusMessage("Inscription complete.");
      toast.success(`${file.name} inscribed successfully!`);
      fetchInscriptions();
    } catch (error: any) {
      console.error("❌ Inscription failed:", error);
      setStatusMessage("");
      toast.error(error?.message || "Failed to inscribe. Please try again.");
      fetchInscriptions();
    } finally {
      setIsInscribing(false);
    }
    setTextInput("");
  };

  // Auto-resume jobs on page load/wallet unlock
  useEffect(() => {
    const autoResumeJobs = async () => {
      if (!wallet || isLocked) {
        console.log("⏭️ Skipping auto-resume: wallet not ready or locked");
        return;
      }

      if (isInscribing) {
        console.log("⏭️ Skipping auto-resume: already inscribing");
        return;
      }

      try {
        // Get processing/pending jobs
        const allJobs = await getAllJobs();
        console.log("🔍 Checking for jobs to resume:", allJobs);

        const jobsToProcess = allJobs.filter(
          (job) => job.status === "processing" || job.status === "pending",
        );

        if (jobsToProcess.length === 0) {
          console.log("✅ No jobs to resume");
          return;
        }

        // Process only the FIRST job
        const job = jobsToProcess[0];

        console.log(`🔄 Auto-resuming: ${job.fileName} (ID: ${job.id})`);
        setIsInscribing(true);

        const feeRate = computeFeeRate();
        toast.info(`Resuming: ${job.fileName}`, { duration: 3000 });

        await processJob(
          job.id,
          wallet,
          feeRate,
          (update: Partial<InscriptionJob>) => {
            console.log("📊 Progress update:", update);
            if (update.currentCommit && update.totalCommits) {
              setStatusMessage(
                `Processing commit ${update.currentCommit}/${update.totalCommits}...`,
              );
            }
            // Refresh history to show progress
            fetchInscriptions();
          },
        );

        toast.success(`${job.fileName} inscribed successfully!`);
        setStatusMessage("");
        fetchInscriptions();
      } catch (error: any) {
        console.error(`❌ Failed to auto-resume:`, error);
        toast.error(`Failed to resume: ${error.message}`);
        setStatusMessage("");
        fetchInscriptions();
      } finally {
        setIsInscribing(false);
      }
    };

    // Small delay to ensure wallet is fully initialized
    const timer = setTimeout(() => {
      autoResumeJobs();
    }, 500);

    return () => clearTimeout(timer);
  }, [wallet, isLocked]);

  // Fetch inscriptions when wallet unlocks or when wallet address changes
  // wallet object changes from null to data when unlocked, triggering refresh
  useEffect(() => {
    fetchInscriptions();
  }, [walletAddress, isLocked, wallet]);

  return (
    <>
      <h2 className="mx-0 my-[0.83em] block text-[1.5em] leading-[1.1] font-bold">
        Inscribe on Pepinals
      </h2>

      <Toaster />

      <Tabs defaultValue="file" className="relative">
        <TabsList className="my-4 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
          <div className="my-2 flex list-none gap-5 overflow-x-auto p-0 select-none">
            <TabsTrigger value="file" className="text-md">
              File
            </TabsTrigger>
            <TabsTrigger value="text" className="text-md">
              Text
            </TabsTrigger>
            <TabsTrigger value="pepemap" className="text-md">
              Pepemap
            </TabsTrigger>
            <TabsTrigger value="deploy" className="text-md">
              Deploy
            </TabsTrigger>
            <TabsTrigger value="mint" className="text-md">
              Mint
            </TabsTrigger>
            <TabsTrigger value="transfer" className="text-md">
              Transfer
            </TabsTrigger>
          </div>
        </TabsList>
        <TabsContent value="file">
          <div className="relative">
            <div className="relative mb-6 min-w-[20rem] rounded-[12px] border-2 border-dashed border-[#696969] bg-[#222] p-8 text-center">
              <div>Click to select files, or drop your files here</div>
              <div className="text-[0.9rem] text-[#ffffffe6]">
                Maximum 2500 files, if you want to inscribe more please split
                them into few batches.
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
        </TabsContent>
        <TabsContent value="text" className="relative">
          <Textarea
            className="focus: relative mb-6 h-28 min-w-[20rem] rounded-[12px] border-2 border-dashed border-[#696969] bg-[#222]"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
        </TabsContent>
        <TabsContent value="pepemap" className="flex flex-row gap-8">
          <div className="mb-6">
            <input
              type="number"
              placeholder="start"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === "e" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              className="font-inherit mr-2 w-36 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
            />
          </div>
          <div className="mb-6">
            <input
              type="number"
              placeholder="end"
              value={endNumber}
              onChange={(e) => setEndNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === "e" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              className="font-inherit mr-2 w-36 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
            />
          </div>
        </TabsContent>
        <TabsContent value="deploy">
          <div className="mb-6">
            <div className="mb-2">Token tick:</div>
            <input
              type="text"
              placeholder="e.g. frog"
              value={deployTick}
              onChange={(e) => setDeployTick(e.target.value)}
              className="font-inherit mr-2 w-lg max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
            />
          </div>
          <div className="flex">
            <div className="mb-6">
              <div className="mb-2">Max supply:</div>
              <input
                type="number"
                placeholder="Total supply"
                value={deployMax}
                onChange={(e) => setDeployMax(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "." || e.key === "e" || e.key === "-") {
                    e.preventDefault();
                  }
                }}
                className="font-inherit mr-4 w-40 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
              />
            </div>
            <div className="mb-6">
              <div className="mb-2">Mint limit:</div>
              <input
                type="number"
                placeholder="Limit per mint"
                value={deployLim}
                onChange={(e) => setDeployLim(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "." || e.key === "e" || e.key === "-") {
                    e.preventDefault();
                  }
                }}
                className="font-inherit mr-4 w-40 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
              />
            </div>
            <div className="mb-6">
              <div className="mb-2">Decimals:</div>
              <input
                type="number"
                placeholder="18"
                value={deployDec}
                onChange={(e) => setDeployDec(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "." || e.key === "e" || e.key === "-") {
                    e.preventDefault();
                  }
                }}
                className="font-inherit mr-2 w-40 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
              />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="mint">
          <div className="mb-6">
            <div className="mb-2">Token tick:</div>
            <input
              type="text"
              placeholder="e.g. frog"
              value={mintTick}
              onChange={(e) => setMintTick(e.target.value)}
              className="font-inherit mr-2 w-lg max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
            />
          </div>
          <div className="mb-6">
            <div className="mb-2">Amount to mint:</div>
            <input
              type="number"
              placeholder="Enter amount"
              value={mintAmt}
              onChange={(e) => setMintAmt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === "e" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              className="font-inherit mr-2 w-lg max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
            />
          </div>
        </TabsContent>
        <TabsContent value="transfer">
          <div className="mb-6">
            <div className="mb-2">Token tick:</div>
            <input
              type="text"
              placeholder="e.g. frog"
              value={transferTick}
              onChange={(e) => setTransferTick(e.target.value)}
              className="font-inherit mr-2 w-lg max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
            />
          </div>
          <div className="mb-6">
            <div className="mb-2">Amount to trnasfer:</div>
            <input
              type="number"
              placeholder="Enter amount"
              value={transferAmt}
              onChange={(e) => setTransferAmt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "." || e.key === "e" || e.key === "-") {
                  e.preventDefault();
                }
              }}
              className="font-inherit mr-2 w-lg max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
            />
          </div>
        </TabsContent>

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
                      onKeyDown={(e) => {
                        if (e.key === "." || e.key === "e" || e.key === "-") {
                          e.preventDefault();
                        }
                      }}
                      placeholder={String(PEPE_PER_KB_FEE)}
                      className="w-10 rounded-md bg-transparent text-white focus:ring-0 focus:outline-none"
                    />
                    <span className="ml-2">pepe/kB</span>
                  </div>
                </label>
              </>
            )}
          </div>
          {files.length > 0 && (
            <div className="mt-6 flex items-center">
              Estimated fee: ~&#xA0;
              <Image
                src="/assets/coin.gif"
                alt="coin"
                width={18}
                height={18}
                priority
                className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
              />
              {estimatedFee > 0 ? estimatedFee.toFixed(6) : "0"}
              {files.length > 0 && estimatedFee === 0 && (
                <span className="ml-2 text-xs text-gray-400">
                  (calculating...)
                </span>
              )}
            </div>
          )}
        </div>

        {/* {isInscribing && (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="text-sm text-green-200">
            ✅ <strong>Your inscription is being saved automatically!</strong>
            <br />
            You can safely refresh the page or close the browser - the
            inscription will automatically resume when you return.
            <br />
            <br />
            💡 <strong>Tip:</strong> You can navigate to other pages while
            inscribing. Check the bottom-right corner to see progress after page
            refresh.
          </div>
        </div>
      )} */}

        <Button
          className="font-inherit rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
          onClick={handleInscribe}
          disabled={isInscribing || inscriptions[0]?.isActiveJob}
        >
          {isInscribing ? statusMessage : "Inscribe"}
        </Button>

        {/* {successTx && (
        <div>
          <div>
            Transaction successful!
            <br />
            Commit TXID: {successTx.commitTxid}
            <br />
            Reveal TXID: {successTx.revealTxid}
          </div>
        </div>
      )} */}

        <div className="mt-6 mb-4 flex items-center justify-between">
          <h3 className="m-0 mx-0 my-[1em] block text-[1.17em] font-bold">
            History
          </h3>
          <div
            onClick={fetchInscriptions}
            className="inline-flex cursor-pointer items-center gap-2 transition-opacity"
          >
            {isLoading ? (
              <>
                <Spinner className="size-6" />
                <span>Loading</span>
              </>
            ) : (
              <>
                <RefreshCw />
                <span>Refresh</span>
              </>
            )}
          </div>
        </div>

        {/* Show message when wallet is locked */}
        {isLocked && hasSavedWallet && (
          <div className="rounded-lg border border-white/20 bg-white/5 p-6 text-center">
            <div className="mb-2 text-lg">🔒 Wallet Locked</div>
            <div className="text-sm text-[#fffc]">
              Please unlock your wallet to view inscription history
            </div>
          </div>
        )}

        {/* Show message when no wallet */}
        {!hasSavedWallet && (
          <div className="rounded-lg border border-white/20 bg-white/5 p-6 text-center">
            <div className="mb-2 text-lg">👛 No Wallet</div>
            <div className="text-sm text-[#fffc]">
              Please create or import a wallet to view inscription history
            </div>
          </div>
        )}

        {/* Show inscriptions only when wallet is unlocked */}
        {!isLocked && hasSavedWallet && (
          <div>
            {inscriptions.length === 0 ? (
              <div className="rounded-lg border border-gray-500/30 bg-gray-500/10 p-6 text-center text-gray-300">
                No inscriptions found
              </div>
            ) : (
              inscriptions.map((item, index) => {
                const isExpanded = expandedItems.has(index);
                const isActive = item.isActiveJob; // Active job from IndexedDB

                return (
                  <div key={index} className="mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-[614px] overflow-hidden text-ellipsis">
                        {isActive
                          ? item.fileName
                          : item.utxo?.txid || item.inscriptionId}
                      </div>
                      <div className="mr-auto text-[0.9rem]">
                        {isActive
                          ? formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                            })
                          : item.timestamp
                            ? formatDistanceToNow(
                                new Date(item.timestamp * 1000),
                                { addSuffix: true },
                              )
                            : "Unknown"}
                      </div>
                      <div className="cursor-pointer text-[0.9rem] font-medium text-[#c891ff] [text-decoration:inherit]">
                        {/* {isActive && item.currentCommit > 0 && (
                        <>
                          commit {item.currentCommit}/
                          {item.resumeData?.locks.length}
                        </>
                      )} */}
                        {isActive && item.currentCommit === 0 && (
                          <>Preparing...</>
                        )}
                        {!isActive && <>copy metadata</>}
                      </div>
                      <div
                        className={`text-right ${isActive ? "text-yellow-500" : "text-green-500"}`}
                      >
                        <div>{isActive ? "inscribing" : "inscribed"}</div>
                        <div>
                          {item.resumeData?.locks.length && isActive
                            ? `commit ${item.currentCommit}/${item.resumeData?.locks.length}`
                            : "1/1"}
                        </div>
                      </div>
                      <div
                        onClick={() => toggleExpanded(index)}
                        className="cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 flex gap-2 text-[0.9rem]">
                        <div>
                          {isActive ? item.contentType : item.content_type}
                        </div>
                        <div>
                          {isActive ? item.fileSize : item.content_length} bytes
                        </div>
                        <div className="ml-auto flex">
                          {!isActive && item.inscription_id && (
                            <Link
                              href={`inscription/${item.inscription_id}`}
                              className="mr-4 cursor-pointer font-medium text-[#dfc0fd] [text-decoration:inherit]"
                            >
                              {item.inscription_id.slice(0, 3)}...
                              {item.inscription_id.slice(-3)}
                            </Link>
                          )}
                          {isActive && (
                            <div className="mx-4 h-2 w-64 overflow-hidden rounded-full bg-gray-700">
                              <div
                                className="h-full bg-linear-to-r from-yellow-500 to-green-500 transition-all duration-300"
                                style={{ width: `${item.progress || 0}%` }}
                              />
                            </div>
                          )}
                          <span
                            className={
                              isActive ? "text-yellow-500" : "text-green-500"
                            }
                          >
                            {isActive ? `${item.progress || 0}%` : "confirmed"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </Tabs>
    </>
  );
}
