"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import {
  processJob,
  hasJobsInProgress,
} from "@/lib/inscription/inscriptionWorker";
import {
  getPendingJobs,
  getProcessingJobs,
  type InscriptionJob,
} from "@/lib/inscription/indexedDB";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ChevronUp, ChevronDown } from "lucide-react";

/**
 * Auto-resume component
 * Automatically detects and resumes in-progress inscriptions on page load
 */
export function InscriptionAutoResume() {
  const { wallet, isLocked } = useProfile();
  const [isResuming, setIsResuming] = useState(false);
  const [activeJob, setActiveJob] = useState<InscriptionJob | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const attemptResume = async () => {
      // Don't resume if already resuming or wallet is locked
      if (isResuming || !wallet || isLocked) return;

      // Check if there are jobs to process
      const hasJobs = await hasJobsInProgress();
      if (!hasJobs) return;

      // Get pending and processing jobs
      const pending = await getPendingJobs();
      const processing = await getProcessingJobs();
      const jobToProcess = processing[0] || pending[0];

      if (!jobToProcess) return;

      setIsResuming(true);
      setActiveJob(jobToProcess);

      console.log("🔄 Auto-resuming job:", jobToProcess.fileName);

      toast.info(`Resuming inscription: ${jobToProcess.fileName}`, {
        id: `job-${jobToProcess.id}`,
        duration: Infinity,
      });

      try {
        const result = await processJob(
          jobToProcess.id,
          wallet,
          Math.max(1, Math.floor((0.042 * 1e8) / 1_000)), // Use recommended fee
          (update) => {
            setActiveJob((prev) => (prev ? { ...prev, ...update } : null));

            // Update toast with progress
            if (update.progress !== undefined) {
              const progressText =
                update.currentCommit && update.totalCommits
                  ? ` (${update.currentCommit}/${update.totalCommits} commits)`
                  : "";

              toast.info(
                `Inscribing ${jobToProcess.fileName}... ${update.progress}%${progressText}`,
                {
                  id: `job-${jobToProcess.id}`,
                  duration: Infinity,
                },
              );
            }
          },
        );

        toast.success(`${jobToProcess.fileName} inscribed successfully!`, {
          id: `job-${jobToProcess.id}`,
          duration: 5000,
        });

        console.log(`✅ Auto-resumed inscription complete`);
        console.log(`   Reveal TXID: ${result.revealTxid}`);
      } catch (error: any) {
        console.error("❌ Auto-resume failed:", error);

        toast.error(
          `Failed to resume ${jobToProcess.fileName}: ${error.message}`,
          {
            id: `job-${jobToProcess.id}`,
            duration: 10000,
          },
        );
      } finally {
        setIsResuming(false);
        setActiveJob(null);

        // Check for more jobs after a short delay
        setTimeout(() => attemptResume(), 1000);
      }
    };

    attemptResume();
  }, [wallet?.address, isLocked]); // Only run when wallet becomes available

  // Show progress UI if resuming
  if (!isResuming || !activeJob) return null;

  return (
    <div className="">
      <div className="mb-4">
        <div className="flex items-center gap-4">
          <div className="w-[614px]">{activeJob.fileName}</div>
          <div className="mr-auto text-[0.9rem]">
            {formatDistanceToNow(
              new Date(activeJob.createdAt).toLocaleString(),
            )}
          </div>
          <div className="cursor-pointer text-[0.9rem] font-medium text-[#c891ff] [text-decoration:inherit]">
            {activeJob.status === "processing" &&
              activeJob.currentCommit > 0 && (
                <>
                  commit {activeJob.currentCommit}/
                  {activeJob.resumeData?.locks.length}
                </>
              )}
            {activeJob.status === "pending" && <>Preparing inscription...</>}
          </div>
          <div className="text-right text-green-500">
            <div>
              {activeJob.currentCommit > 0 ? "inscribing" : "Processing"}
            </div>
            <div>0/1</div>
          </div>
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer"
          >
            {isExpanded ? <ChevronUp /> : <ChevronDown />}
          </div>
        </div>
        {isExpanded && (
          <div className="mt-2 flex gap-2 text-[0.9rem]">
            <div>{activeJob.contentType}</div>
            <div>{activeJob.fileSize} bytes</div>
            <div className="ml-auto flex">
              <div className="mx-4 h-2 w-66 overflow-hidden rounded-full bg-gray-700">
                <div
                  className="h-full bg-linear-to-r from-green-500 to-yellow-200 transition-all duration-300"
                  style={{ width: `${activeJob.progress || 0}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
