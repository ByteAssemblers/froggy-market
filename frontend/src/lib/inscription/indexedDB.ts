/**
 * IndexedDB storage for inscription jobs
 * Unlike localStorage, IndexedDB:
 * - Persists across browser closes
 * - Can store large binary data (file contents)
 * - Has much larger storage limits (50MB+)
 */

const DB_NAME = "PepecoinInscriptions";
const DB_VERSION = 1;
const JOBS_STORE = "inscription_jobs";
const FILES_STORE = "file_data";

export interface InscriptionJob {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  currentCommit: number;
  totalCommits: number;
  inscriptionId?: string;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;

  // Resume data (saved at each commit)
  resumeData?: {
    lastTxid: string;
    lastRawTx: string;
    ephemeralWIF: string;
    segments: any[];
    locks: any[];
    segmentValues: number[];
    chainPlan: any;
    targetCommitOutput: number;
    baseCommitValue: number;
  };
}

let dbInstance: IDBDatabase | null = null;

export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create jobs store
      if (!db.objectStoreNames.contains(JOBS_STORE)) {
        const jobsStore = db.createObjectStore(JOBS_STORE, { keyPath: "id" });
        jobsStore.createIndex("status", "status", { unique: false });
        jobsStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // Create files store (separate to avoid size issues)
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: "jobId" });
      }
    };
  });
}

export async function saveJob(job: InscriptionJob): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOBS_STORE], "readwrite");
    const store = transaction.objectStore(JOBS_STORE);
    const request = store.put(job);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveFileData(jobId: string, fileData: Uint8Array): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], "readwrite");
    const store = transaction.objectStore(FILES_STORE);
    const request = store.put({ jobId, data: fileData });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getJob(jobId: string): Promise<InscriptionJob | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOBS_STORE], "readonly");
    const store = transaction.objectStore(JOBS_STORE);
    const request = store.get(jobId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getFileData(jobId: string): Promise<Uint8Array | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE], "readonly");
    const store = transaction.objectStore(FILES_STORE);
    const request = store.get(jobId);

    request.onsuccess = () => resolve(request.result?.data || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllJobs(): Promise<InscriptionJob[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOBS_STORE], "readonly");
    const store = transaction.objectStore(JOBS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingJobs(): Promise<InscriptionJob[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOBS_STORE], "readonly");
    const store = transaction.objectStore(JOBS_STORE);
    const index = store.index("status");
    const request = index.getAll("pending");

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getProcessingJobs(): Promise<InscriptionJob[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOBS_STORE], "readonly");
    const store = transaction.objectStore(JOBS_STORE);
    const index = store.index("status");
    const request = index.getAll("processing");

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteJob(jobId: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([JOBS_STORE, FILES_STORE], "readwrite");

    const jobsStore = transaction.objectStore(JOBS_STORE);
    const filesStore = transaction.objectStore(FILES_STORE);

    jobsStore.delete(jobId);
    filesStore.delete(jobId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateJobProgress(
  jobId: string,
  updates: Partial<InscriptionJob>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");

  const updatedJob = { ...job, ...updates };
  await saveJob(updatedJob);
}
