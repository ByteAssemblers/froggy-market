"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { X } from "lucide-react";

import { decryptWallet } from "@/lib/wallet/storage";
import {
  ensureCryptoReady,
  buildEPH,
  buildPepinalsPartial,
  buildLockForPartial,
  buildCommitPsbtMulti,
  finalizeAndExtractPsbtBase64,
  buildAndSignRevealTx,
  REVEAL_FEE_PADDING_SATS,
  splitPartialForScriptSig,
  calculateCommitChainPlan,
  buildChainedCommitTx,
  fetchUtxos,
} from "@/lib/inscribe";
import {
  resolveFileContentType,
  broadcastRawTxCore,
  waitForRawTx,
  signPsbtWithWallet,
} from "@/lib/file";
import {
  PEPE_PER_KB_FEE,
  MARKET_FEE,
  MIN_COMMIT_VALUE,
  RECOMMENDED_FEE,
  DEFAULT_COMMIT_PEP,
  MAX_INSCRIPTION_SIZE,
} from "@/constants/inscription";

export default function InscribeTabs() {
  const [isInscribing, setIsInscribing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [pepePer, setPepePer] = useState<number>(PEPE_PER_KB_FEE);
  const [pepePerState, setPepePerState] = useState<"recommended" | "custom">(
    "recommended",
  );
  const [loading, setLoading] = useState(false); // Track loading state
  const [errorMessage, setErrorMessage] = useState(""); // Track error messages
  const [successTx, setSuccessTx] = useState<any>(null); // Track successful transactions

  const [wallet, setWallet] = useState<any>(null);
  const [hasSavedWallet, setHasSavedWallet] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pepecoin_wallet");

    if (stored) {
      const parsed = JSON.parse(stored);
      setHasSavedWallet(true);

      if (parsed.passwordProtected) {
        setIsLocked(true);
      } else {
        decryptWallet(parsed, "")
          .then((w) => {
            setWallet(w);
          })
          .catch(() => console.error("Auto-unlock failed"));
      }
    }
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

  const perCommitValue = () => {
    const fromEnv =
      Number.isFinite(DEFAULT_COMMIT_PEP) && DEFAULT_COMMIT_PEP > 0
        ? DEFAULT_COMMIT_PEP
        : 0.015;
    const baseSats = Math.max(MIN_COMMIT_VALUE, Math.floor(fromEnv * 1e8));
    if (baseSats <= MIN_COMMIT_VALUE) {
      return MIN_COMMIT_VALUE;
    }
    if (baseSats <= MIN_COMMIT_VALUE + REVEAL_FEE_PADDING_SATS) {
      return MIN_COMMIT_VALUE;
    }
    return baseSats - REVEAL_FEE_PADDING_SATS;
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

  // Handle Inscription
  const handleInscribe = async () => {
    setErrorMessage("");
    setSuccessTx(null);

    if (!hasSavedWallet) {
      setErrorMessage("Connect your wallet before inscribing.");
      return;
    }

    if (isLocked) {
      setErrorMessage("Unlock your wallet to inscribe.");
      return;
    }

    if (files.length === 0) {
      setErrorMessage("Please select a file to inscribe.");
      return;
    }

    if (files.length > 1) {
      setErrorMessage(
        "Multiple file inscriptions are not supported yet. Please pick a single file.",
      );
      return;
    }

    try {
      setIsInscribing(true);
      let payload;
      let contentType = "application/octet-stream";

      const file = files[0];
      setStatusMessage("Reading file payload…");
      try {
        const buffer = await file.arrayBuffer();
        payload = new Uint8Array(buffer);
      } catch (_readErr) {
        throw new Error("Failed to read the selected file. Please try again.");
      }
      contentType = resolveFileContentType(file);

      setStatusMessage("Preparing inscription data…");

      await ensureCryptoReady();

      const eph = await buildEPH();
      const partial = buildPepinalsPartial(contentType, payload);
      const segments = splitPartialForScriptSig(partial);
      if (!segments.length) {
        throw new Error("Failed to prepare inscription payload segments.");
      }
      const locks = segments.map((segment) =>
        buildLockForPartial(eph.publicKey, segment.length),
      );
      const feeRate = computeFeeRate();
      const chainPlan = calculateCommitChainPlan({
        segments,
        locks,
        feeRate,
        revealOutputValue: 100_000,
        revealFeePadding: REVEAL_FEE_PADDING_SATS,
      });
      const finalPartial = segments[segments.length - 1];
      const firstLock = locks[0];
      const segmentValues = [...chainPlan.segmentValues];
      const targetCommitOutput = Math.max(
        chainPlan.commitOutputValue,
        perCommitValue() + chainPlan.revealFee,
      );
      if (targetCommitOutput !== chainPlan.commitOutputValue) {
        segmentValues[0] = targetCommitOutput;
      }
      const baseCommitValue = Math.max(
        MIN_COMMIT_VALUE,
        targetCommitOutput - chainPlan.revealFee,
      );

      setStatusMessage("Fetching wallet UTXOs…");
      let utxos;
      try {
        utxos = await fetchUtxos(wallet.address);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
          throw new Error(
            "Wallet not initialised on-chain. Deposit PEP to this address and wait for a confirmation before inscribing.",
          );
        }
        throw err;
      }

      const spendable = utxos.filter(
        (u) => Number.isFinite(u.value) && u.value > 0,
      );
      if (!spendable.length) {
        throw new Error(
          "No spendable UTXOs found. Add PEP to your wallet and wait for confirmation.",
        );
      }

      setStatusMessage("Building commit transaction…");
      const commitPsbt = await buildCommitPsbtMulti({
        utxos: spendable,
        lockScript: firstLock,
        perCommitValue: baseCommitValue,
        changeAddress: wallet.address,
        feeRate,
        partialItems: finalPartial,
        revealFeePadding: REVEAL_FEE_PADDING_SATS,
        commitOutputValueOverride: targetCommitOutput,
      });

      setStatusMessage("Signing commit transaction…");
      const signedCommitBase64 = await signPsbtWithWallet(
        commitPsbt.toBase64(),
        wallet.privateKey,
      );
      setStatusMessage("Broadcasting commit transaction…");
      const commitHex = await finalizeAndExtractPsbtBase64(signedCommitBase64);
      const commitTxid = await broadcastRawTxCore(commitHex);

      let currentCommitTxid = commitTxid;
      let currentCommitRaw = commitHex;
      const ephWIF = eph.toWIF();

      if (segments.length > 1) {
        for (let idx = 1; idx < segments.length; idx += 1) {
          setStatusMessage(
            `Building chained commit ${idx + 1} of ${segments.length}…`,
          );
          const { hex: chainedHex } = await buildChainedCommitTx({
            prevTxId: currentCommitTxid,
            prevVout: 0,
            prevRawTx: currentCommitRaw,
            lockScript: locks[idx - 1],
            partialItems: segments[idx - 1],
            nextLockScript: locks[idx],
            nextOutputValue: segmentValues[idx],
            ephemeralWIF: ephWIF,
          });
          setStatusMessage(
            `Broadcasting chained commit ${idx + 1} of ${segments.length}…`,
          );
          const broadcastTxid = await broadcastRawTxCore(chainedHex);
          currentCommitTxid = broadcastTxid;
          currentCommitRaw = chainedHex;
        }
      }

      setStatusMessage("Waiting for commit to confirm…");
      const commitRaw = await waitForRawTx(currentCommitTxid, {
        timeoutMs: 900_000,
        intervalMs: 2_000,
      });

      setStatusMessage("Building reveal transaction…");
      const revealHex = await buildAndSignRevealTx({
        prevTxId: currentCommitTxid,
        prevVout: 0,
        prevRawTx: commitRaw,
        lockScript: locks[locks.length - 1],
        partialItems: finalPartial,
        revealOutputValue: 100_000,
        toAddress: wallet.address,
        ephemeralWIF: ephWIF,
        feeRate,
        revealFeePadding: REVEAL_FEE_PADDING_SATS,
      });

      setStatusMessage("Broadcasting reveal transaction…");
      const revealTxid = await broadcastRawTxCore(revealHex);
      setStatusMessage("Inscription complete.");
      setSuccessTx({ commitTxid: currentCommitTxid, revealTxid });
    } catch (error: any) {
      console.error("Inscription failed", error);
      setStatusMessage("");
      setErrorMessage(
        error?.message || "Failed to inscribe. Please try again.",
      );
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
        onClick={handleInscribe}
      >
        {loading ? "Inscribing..." : "Inscribe"}
      </Button>

      {errorMessage && <div className="text-red-500">{errorMessage}</div>}
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
