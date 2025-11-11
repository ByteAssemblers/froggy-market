/**
 * Background inscription worker
 * Processes inscription jobs from IndexedDB queue
 * Runs automatically on page load and continues processing
 */

import {
  ensureCryptoReady,
  buildEPH,
  buildPepinalsPartial,
  buildLockForPartial,
  buildCommitPsbtMulti,
  finalizeAndExtractPsbtBase64,
  buildAndSignRevealTx,
  splitPartialForScriptSig,
  calculateCommitChainPlan,
  buildChainedCommitTx,
  fetchUtxos,
  broadcastRawTxCore,
  waitForRawTx,
  signPsbtWithWallet,
} from "@/lib/inscription/inscribe";
import {
  MIN_COMMIT_VALUE,
  DEFAULT_COMMIT_PEP,
  REVEAL_FEE_PADDING_SATS,
} from "@/constants/inscription";
import {
  getJob,
  getFileData,
  saveJob,
  deleteJob,
  getPendingJobs,
  getProcessingJobs,
  type InscriptionJob,
} from "@/lib/inscription/indexedDB";

const BATCH_SIZE = 24;

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

export async function processJob(
  jobId: string,
  wallet: any,
  feeRate: number,
  onProgress?: (update: Partial<InscriptionJob>) => void
): Promise<{ commitTxid: string; revealTxid: string }> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");

  const fileData = await getFileData(jobId);
  if (!fileData) throw new Error("File data not found");

  console.log(`🚀 Processing job: ${job.fileName}`);

  try {
    await ensureCryptoReady();

    // Check if resuming
    if (job.resumeData && job.currentCommit > 0) {
      console.log(`🔄 Resuming from commit ${job.currentCommit}/${job.totalCommits}`);
      return await resumeJob(jobId, wallet, feeRate, onProgress);
    }

    // Start fresh inscription
    const eph = await buildEPH();
    const partial = buildPepinalsPartial(job.contentType, fileData);
    const segments = splitPartialForScriptSig(partial);

    if (!segments.length) {
      throw new Error("Failed to prepare inscription payload segments.");
    }

    console.log(`📏 File size: ${job.fileSize} bytes`);
    console.log(`🔗 Segments required: ${segments.length}`);

    const locks = segments.map((segment) =>
      buildLockForPartial(eph.publicKey, segment.length)
    );
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
      perCommitValue() + chainPlan.revealFee
    );

    if (targetCommitOutput !== chainPlan.commitOutputValue) {
      segmentValues[0] = targetCommitOutput;
    }

    const baseCommitValue = Math.max(
      MIN_COMMIT_VALUE,
      targetCommitOutput - chainPlan.revealFee
    );

    const utxos = await fetchUtxos(wallet.address);
    const spendable = utxos.filter(
      (u: any) => Number.isFinite(u.value) && u.value > 0
    );

    if (!spendable.length) {
      throw new Error("No spendable UTXOs found.");
    }

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

    const signedCommitBase64 = await signPsbtWithWallet(
      commitPsbt.toBase64(),
      wallet.privateKey
    );
    const commitHex = await finalizeAndExtractPsbtBase64(signedCommitBase64);
    const commitTxid = await broadcastRawTxCore(commitHex);

    console.log(`✅ Initial commit broadcasted: ${commitTxid}`);

    let currentCommitTxid = commitTxid;
    let currentCommitRaw = commitHex;
    const ephWIF = eph.toWIF();

    // Save resume data
    await saveJob({
      ...job,
      status: "processing",
      totalCommits: segments.length,
      currentCommit: 1,
      progress: 10,
      startedAt: Date.now(),
      resumeData: {
        lastTxid: currentCommitTxid,
        lastRawTx: currentCommitRaw,
        ephemeralWIF: ephWIF,
        segments,
        locks,
        segmentValues,
        chainPlan,
        targetCommitOutput,
        baseCommitValue,
      },
    });

    if (onProgress) {
      onProgress({ status: "processing", currentCommit: 1, totalCommits: segments.length, progress: 10 });
    }

    // Process chained commits
    if (segments.length > 1) {
      for (let idx = 1; idx < segments.length; idx += 1) {
        // Wait for batch confirmation
        if (idx > 0 && idx % BATCH_SIZE === 0) {
          const batchNum = Math.floor(idx / BATCH_SIZE);
          console.log(`⏳ Waiting for batch ${batchNum} to confirm...`);

          const confirmedRaw = await waitForRawTx(currentCommitTxid, {
            timeoutMs: 900_000,
            intervalMs: 5_000,
            jitterMs: 500,
            confirmed: true,
          });
          currentCommitRaw = confirmedRaw;
          console.log(`✅ Batch ${batchNum} confirmed!`);
        }

        // Build and broadcast next commit
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

        const broadcastTxid = await broadcastRawTxCore(chainedHex);
        currentCommitTxid = broadcastTxid;
        currentCommitRaw = chainedHex;

        const progress = 10 + Math.floor((idx / segments.length) * 75);

        // Save progress after each commit
        await saveJob({
          ...job,
          status: "processing",
          currentCommit: idx + 1,
          progress,
          resumeData: {
            lastTxid: currentCommitTxid,
            lastRawTx: currentCommitRaw,
            ephemeralWIF: ephWIF,
            segments,
            locks,
            segmentValues,
            chainPlan,
            targetCommitOutput,
            baseCommitValue,
          },
        });

        if (onProgress) {
          onProgress({ currentCommit: idx + 1, progress });
        }

        console.log(`✅ Chained commit ${idx + 1}/${segments.length} completed`);
      }
    }

    // Wait for final commit
    console.log(`⏳ Waiting for final commit to confirm...`);
    const commitRaw = await waitForRawTx(currentCommitTxid, {
      timeoutMs: 900_000,
      intervalMs: 5_000,
      jitterMs: 500,
      confirmed: true,
    });
    console.log(`✅ Final commit confirmed!`);

    // Build and broadcast reveal
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

    const revealTxid = await broadcastRawTxCore(revealHex);
    console.log(`✅ Reveal transaction broadcasted: ${revealTxid}`);

    // Mark as completed
    await saveJob({
      ...job,
      status: "completed",
      progress: 100,
      inscriptionId: revealTxid,
      completedAt: Date.now(),
    });

    if (onProgress) {
      onProgress({ status: "completed", progress: 100, inscriptionId: revealTxid });
    }

    // Delete file data to save space
    setTimeout(() => deleteJob(jobId), 5000);

    return { commitTxid: currentCommitTxid, revealTxid };
  } catch (error: any) {
    console.error(`❌ Job failed: ${job.fileName}`, error);

    await saveJob({
      ...job,
      status: "failed",
      error: error.message || "Unknown error",
      completedAt: Date.now(),
    });

    if (onProgress) {
      onProgress({ status: "failed", error: error.message });
    }

    throw error;
  }
}

async function resumeJob(
  jobId: string,
  wallet: any,
  feeRate: number,
  onProgress?: (update: Partial<InscriptionJob>) => void
): Promise<{ commitTxid: string; revealTxid: string }> {
  const job = await getJob(jobId);
  if (!job || !job.resumeData) throw new Error("Cannot resume job");

  const {
    lastTxid,
    lastRawTx,
    ephemeralWIF,
    segments,
    locks,
    segmentValues,
  } = job.resumeData;

  let currentCommitTxid = lastTxid;
  let currentCommitRaw = lastRawTx;

  console.log(`🔄 Resuming from commit ${job.currentCommit}/${job.totalCommits}`);

  // Continue from where we left off
  for (let idx = job.currentCommit; idx < segments.length; idx += 1) {
    // Wait for batch confirmation
    if (idx > 0 && idx % BATCH_SIZE === 0) {
      const batchNum = Math.floor(idx / BATCH_SIZE);
      console.log(`⏳ Waiting for batch ${batchNum} to confirm...`);

      const confirmedRaw = await waitForRawTx(currentCommitTxid, {
        timeoutMs: 900_000,
        intervalMs: 5_000,
        jitterMs: 500,
        confirmed: true,
      });
      currentCommitRaw = confirmedRaw;
      console.log(`✅ Batch ${batchNum} confirmed!`);
    }

    // Build and broadcast next commit
    const { hex: chainedHex } = await buildChainedCommitTx({
      prevTxId: currentCommitTxid,
      prevVout: 0,
      prevRawTx: currentCommitRaw,
      lockScript: locks[idx - 1],
      partialItems: segments[idx - 1],
      nextLockScript: locks[idx],
      nextOutputValue: segmentValues[idx],
      ephemeralWIF: ephemeralWIF,
    });

    const broadcastTxid = await broadcastRawTxCore(chainedHex);
    currentCommitTxid = broadcastTxid;
    currentCommitRaw = chainedHex;

    const progress = 10 + Math.floor((idx / segments.length) * 75);

    // Save progress
    await saveJob({
      ...job,
      currentCommit: idx + 1,
      progress,
      resumeData: {
        ...job.resumeData,
        lastTxid: currentCommitTxid,
        lastRawTx: currentCommitRaw,
      },
    });

    if (onProgress) {
      onProgress({ currentCommit: idx + 1, progress });
    }

    console.log(`✅ Resumed commit ${idx + 1}/${segments.length}`);
  }

  // Wait for final commit
  console.log(`⏳ Waiting for final commit to confirm...`);
  const commitRaw = await waitForRawTx(currentCommitTxid, {
    timeoutMs: 900_000,
    intervalMs: 5_000,
    jitterMs: 500,
    confirmed: true,
  });
  console.log(`✅ Final commit confirmed!`);

  // Build and broadcast reveal
  const finalPartial = segments[segments.length - 1];
  const revealHex = await buildAndSignRevealTx({
    prevTxId: currentCommitTxid,
    prevVout: 0,
    prevRawTx: commitRaw,
    lockScript: locks[locks.length - 1],
    partialItems: finalPartial,
    revealOutputValue: 100_000,
    toAddress: wallet.address,
    ephemeralWIF: ephemeralWIF,
    feeRate,
    revealFeePadding: REVEAL_FEE_PADDING_SATS,
  });

  const revealTxid = await broadcastRawTxCore(revealHex);
  console.log(`✅ Reveal transaction broadcasted: ${revealTxid}`);

  // Mark as completed
  await saveJob({
    ...job,
    status: "completed",
    progress: 100,
    inscriptionId: revealTxid,
    completedAt: Date.now(),
  });

  if (onProgress) {
    onProgress({ status: "completed", progress: 100, inscriptionId: revealTxid });
  }

  // Delete file data
  setTimeout(() => deleteJob(jobId), 5000);

  return { commitTxid: currentCommitTxid, revealTxid };
}

export async function hasJobsInProgress(): Promise<boolean> {
  const pending = await getPendingJobs();
  const processing = await getProcessingJobs();
  return pending.length > 0 || processing.length > 0;
}
