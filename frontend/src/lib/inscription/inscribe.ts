import * as bitcoinjs from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";
import { pepeNetwork } from "@/lib/wallet/pepeNetwork";
import axios from "axios";
import {
  CONTENT_TYPE_BY_EXTENSION,
  REVEAL_EXTRA_FLAT_FEE_SATS,
  DEFAULT_SIGNATURE_PUSH_BYTES,
  MAX_SCRIPT_CHUNK_BYTES,
  MAX_PARTIAL_SCRIPT_BYTES,
  FileExtension,
} from "@/constants/inscription";

let readyPromise: Promise<{ btc: any; ecc: any; ECPair: any }> | undefined;
let BTC: any;
let ECC: any;
let ECPair: any;

function extractHexField(data: any) {
  if (typeof data === "string") return data.trim();
  if (!data || typeof data !== "object") return null;
  if (typeof data.hex === "string") return data.hex.trim();
  if (typeof data.raw === "string") return data.raw.trim();
  if (typeof data.result === "string") return data.result.trim();
  if (typeof data.data === "string") return data.data.trim();
  return null;
}

export async function fetchRawTransaction(txid: any) {
  const response = await axios.get(
    `https://api2.dogepaywallet.space/tx/${txid}/hex`,
  );
  const originalHex: any = extractHexField(response.data);

  let hex =
    (typeof originalHex === "string" && originalHex) ||
    (originalHex && (originalHex.hex || originalHex.data)) ||
    null;

  if (typeof hex !== "string") {
    throw new Error("Failed to parse transaction hex from API response");
  }

  hex = hex.trim().toLowerCase();
  if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid hex returned by API");
  }
  return hex;
}

export async function fetchUtxos(address: string) {
  const response = await axios.get(
    `https://api2.dogepaywallet.space/address/${address}/utxo`,
  );
  const utxos = response.data;

  if (!Array.isArray(utxos)) return [];
  return utxos.map((u) => ({
    txid: u.txid,
    vout: Number(u.vout),
    value: Number(u.value),
    scriptPubKey: u.scriptPubKey,
    confirmations: typeof u.confirmations === "number" ? u.confirmations : 0,
    rawTxHex: u.rawTxHex,
  }));
}

export function ensureCryptoReady(): Promise<{
  btc: any;
  ecc: any;
  ECPair: any;
}> {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    const btc = await import("bitcoinjs-lib");
    const eccMod = await import("@bitcoinerlab/secp256k1");
    const ecc = eccMod.default ?? eccMod;
    const { ECPairFactory } = await import("ecpair");
    const pair = ECPairFactory(ecc);
    btc.initEccLib(ecc);
    BTC = btc;
    ECC = ecc;
    ECPair = pair;
    return { btc: BTC, ecc: ECC, ECPair };
  })();
  return readyPromise;
}

const getBtc = async () => (await ensureCryptoReady()).btc;
const getECPair = async () => (await ensureCryptoReady()).ECPair;

interface NormalizeSatsOptions {
  allowZero?: boolean;
}

function normalizeSats(
  value: bigint | number,
  label: string,
  { allowZero = false }: NormalizeSatsOptions = {},
): number {
  if (typeof value === "bigint") {
    if (value < BigInt(0) || (!allowZero && value === BigInt(0))) {
      throw new Error(
        `${label} must be a${allowZero ? " non-negative" : " positive"} integer (koinu)`,
      );
    }
    if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`${label} exceeds supported range`);
    }
    return Number(value);
  }
  if (!Number.isFinite(value) || value < 0 || (!allowZero && value === 0)) {
    throw new Error(
      `${label} must be a${allowZero ? " non-negative" : " positive"} integer (koinu)`,
    );
  }
  return Math.floor(value);
}

function numberToChunk(n: number): Buffer {
  if (n === 0) return Buffer.alloc(0);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("numberToChunk: expected non-negative integer");
  }
  let value = Math.floor(n);
  const bytes: number[] = [];
  while (value > 0) {
    bytes.push(value & 0xff);
    value >>= 8;
  }
  if (!bytes.length) {
    return Buffer.alloc(0);
  }
  const last = bytes[bytes.length - 1];
  if (last & 0x80) {
    bytes.push(0x00);
  }
  return Buffer.from(bytes);
}

function bufferToChunk(
  data: Buffer | Uint8Array | string | ArrayBuffer,
): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === "string") return Buffer.from(data, "utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  throw new Error("Unsupported chunk input type");
}

function compileScriptLength(items: any[]): number {
  if (!BTC) throw new Error("Bitcoinjs not initialised yet");
  const normalized = items.map(bufferToChunk);
  const script = BTC.script.compile(normalized);
  return script.length;
}

export const buildEPH = async () => {
  const pair = await getECPair();
  return pair.makeRandom({ network: pepeNetwork });
};

export async function finalizeAndExtractPsbtBase64(
  psbtBase64: string,
): Promise<string> {
  const btc = await getBtc();
  const psbt = btc.Psbt.fromBase64(psbtBase64);
  try {
    psbt.validateSignaturesOfAllInputs();
  } catch (_err) {}
  psbt.finalizeAllInputs();
  return psbt.extractTransaction().toHex();
}

export function buildPepinalsPartial(
  contentType: string,
  payload: any,
): Buffer[] {
  if (!BTC) throw new Error("Bitcoinjs not initialised yet");
  const data = bufferToChunk(payload);
  const parts =
    data.length === 0
      ? [Buffer.alloc(0)]
      : Array.from(
          { length: Math.ceil(data.length / MAX_SCRIPT_CHUNK_BYTES) },
          (_unused, idx) => {
            const start = idx * MAX_SCRIPT_CHUNK_BYTES;
            const end = Math.min(start + MAX_SCRIPT_CHUNK_BYTES, data.length);
            return data.subarray(start, end);
          },
        );
  const items: Buffer[] = [];
  items.push(bufferToChunk("ord"));
  items.push(numberToChunk(parts.length));
  items.push(bufferToChunk(contentType));
  parts.forEach((part, idx) => {
    items.push(numberToChunk(parts.length - idx - 1));
    items.push(part);
  });
  return items;
}

export function splitPartialForScriptSig(
  partialItems: any[],
  { maxScriptBytes = MAX_PARTIAL_SCRIPT_BYTES } = {},
): Buffer[][] {
  if (!Array.isArray(partialItems) || partialItems.length === 0) {
    throw new Error(
      "splitPartialForScriptSig: partialItems must be a non-empty array",
    );
  }
  if (!BTC) throw new Error("Bitcoinjs not initialised yet");

  const queue = partialItems.map(bufferToChunk);
  const segments: Buffer[][] = [];
  let first = true;

  while (queue.length) {
    const segment: Buffer[] = [];

    if (first) {
      segment.push(queue.shift()!);
      first = false;
    }

    while (queue.length) {
      segment.push(queue.shift()!);
      if (!queue.length) break;
      segment.push(queue.shift()!);

      const length = compileScriptLength(segment);
      if (length > maxScriptBytes) {
        const lastB = segment.pop();
        const lastA = segment.pop();
        if (lastB !== undefined) queue.unshift(lastB);
        if (lastA !== undefined) queue.unshift(lastA);
        break;
      }
    }

    segments.push(segment.map(bufferToChunk));
  }

  return segments;
}

export function buildLockForPartial(
  pubkey: Buffer,
  partialLen: number,
): Buffer {
  if (!BTC) throw new Error("Bitcoinjs not initialised yet");
  const chunks: any[] = [pubkey, BTC.opcodes.OP_CHECKSIGVERIFY];
  for (let i = 0; i < partialLen; i += 1) {
    chunks.push(BTC.opcodes.OP_DROP);
  }
  chunks.push(BTC.opcodes.OP_TRUE);
  return BTC.script.compile(chunks);
}

export function p2shOutputScriptFromLock(lockScript: Buffer): Buffer {
  if (!BTC) throw new Error("Bitcoinjs not initialised yet");
  const lockHash160 = BTC.crypto.hash160(lockScript);
  return BTC.script.compile([
    BTC.opcodes.OP_HASH160,
    lockHash160,
    BTC.opcodes.OP_EQUAL,
  ]);
}

function varIntBytes(n: number): number {
  if (n < 0xfd) return 1;
  if (n <= 0xffff) return 3;
  if (n <= 0xffffffff) return 5;
  return 9;
}

function estimateRevealScriptSigSize(
  partialItems: any[],
  lockScript: Buffer,
): number {
  if (!BTC) throw new Error("Bitcoinjs not initialised yet");
  if (!Array.isArray(partialItems) || partialItems.length === 0) return 0;
  if (!lockScript) return 0;
  const normalizedItems = partialItems.map(bufferToChunk);
  const dummySig = Buffer.alloc(DEFAULT_SIGNATURE_PUSH_BYTES, 0);
  const compiled = BTC.script.compile([
    ...normalizedItems,
    dummySig,
    lockScript,
  ]);
  return compiled.length;
}

function estimateRevealTxVBytes(
  partialItems: any[],
  lockScript: Buffer,
): number {
  const scriptSigLength = estimateRevealScriptSigSize(partialItems, lockScript);
  if (scriptSigLength <= 0) return 0;
  const version = 4;
  const prevout = 32 + 4;
  const sequence = 4;
  const lockTime = 4;
  const inputCountVarInt = 1;
  const outputCountVarInt = 1;
  const scriptSigVarInt = varIntBytes(scriptSigLength);
  const outputValue = 8;
  const scriptPubKeyLength = 25; // standard P2PKH
  const scriptPubKeyVarInt = 1; // 25 < 0xfd
  return (
    version +
    inputCountVarInt +
    prevout +
    scriptSigVarInt +
    scriptSigLength +
    sequence +
    outputCountVarInt +
    outputValue +
    scriptPubKeyVarInt +
    scriptPubKeyLength +
    lockTime
  );
}

function estimateChainedCommitTxVBytes(
  partialItems: any[],
  lockScript: Buffer,
): number {
  const scriptSigLength = estimateRevealScriptSigSize(partialItems, lockScript);
  if (scriptSigLength <= 0) return 0;
  const version = 4;
  const prevout = 32 + 4;
  const sequence = 4;
  const lockTime = 4;
  const inputCountVarInt = 1;
  const outputCountVarInt = 1;
  const scriptSigVarInt = varIntBytes(scriptSigLength);
  const outputValue = 8;
  const scriptPubKeyLength = 23; // standard P2SH
  const scriptPubKeyVarInt = 1; // 23 < 0xfd
  return (
    version +
    inputCountVarInt +
    prevout +
    scriptSigVarInt +
    scriptSigLength +
    sequence +
    outputCountVarInt +
    outputValue +
    scriptPubKeyVarInt +
    scriptPubKeyLength +
    lockTime
  );
}

function calculateRevealFeeBudget({
  feeRate,
  partialItems,
  lockScript,
  extraFlatFee,
}: {
  feeRate: number;
  partialItems: any[];
  lockScript: Buffer;
  extraFlatFee?: number;
}): number {
  const flatFee = normalizeSats(extraFlatFee ?? 0, "revealExtraFlatFee", {
    allowZero: true,
  });
  const normalizedRate = normalizeSats(feeRate ?? 0, "feeRate", {
    allowZero: true,
  });
  if (!Array.isArray(partialItems) || partialItems.length === 0) {
    return flatFee;
  }
  const revealVBytes = estimateRevealTxVBytes(partialItems, lockScript);
  if (revealVBytes <= 0) {
    return flatFee;
  }
  const dynamic = BigInt(normalizedRate) * BigInt(revealVBytes);
  const total = dynamic + BigInt(flatFee);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Estimated reveal fee exceeds supported range");
  }
  return Number(total);
}

export function calculateCommitChainPlan({
  segments,
  locks,
  feeRate,
  revealOutputValue,
  revealFeePadding = REVEAL_EXTRA_FLAT_FEE_SATS,
}: {
  segments: any[];
  locks: any[];
  feeRate: number;
  revealOutputValue: number;
  revealFeePadding?: number;
}) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new Error(
      "calculateCommitChainPlan: segments must be a non-empty array",
    );
  }
  if (!Array.isArray(locks) || locks.length !== segments.length) {
    throw new Error(
      "calculateCommitChainPlan: locks must match segments length",
    );
  }

  const revealOutputSats = normalizeSats(
    revealOutputValue,
    "revealOutputValue",
  );
  const revealPartial = segments[segments.length - 1];
  const revealLock = locks[locks.length - 1];

  const revealFee = calculateRevealFeeBudget({
    feeRate,
    partialItems: revealPartial,
    lockScript: revealLock,
    extraFlatFee: revealFeePadding,
  });

  const normalizedRate = normalizeSats(feeRate ?? 0, "feeRate", {
    allowZero: true,
  });
  const values: number[] = new Array(segments.length);
  values[segments.length - 1] = revealOutputSats + revealFee;

  const fees: number[] = new Array(Math.max(segments.length - 1, 0));

  for (let i = segments.length - 2; i >= 0; i -= 1) {
    const vbytes = estimateChainedCommitTxVBytes(segments[i], locks[i]);
    const fee = Math.max(1, Math.floor(normalizedRate * vbytes));
    fees[i] = fee;
    values[i] = values[i + 1] + fee;
  }

  values.forEach((value, idx) => {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Derived commit output value for segment ${idx} is invalid`,
      );
    }
  });

  return {
    revealFee,
    commitOutputValue: values[0],
    segmentValues: values,
    segmentFees: fees,
  };
}

export async function buildCommitPsbtMulti({
  utxos,
  lockScript,
  perCommitValue,
  changeAddress,
  feeRate,
  partialItems,
  revealFeePadding = REVEAL_EXTRA_FLAT_FEE_SATS,
  commitOutputValueOverride,
}: {
  utxos: any[];
  lockScript: Buffer;
  perCommitValue: number;
  changeAddress: string;
  feeRate: number;
  partialItems: any[];
  revealFeePadding?: number;
  commitOutputValueOverride?: number;
}) {
  const btc = await getBtc();
  const psbt = new btc.Psbt({ network: pepeNetwork });
  psbt.setVersion(1);

  if (!utxos?.length) throw new Error("No UTXOs provided");
  if (!lockScript) throw new Error("No lock script provided");

  const baseCommitValue = normalizeSats(perCommitValue, "perCommitValue");
  const revealFee = calculateRevealFeeBudget({
    feeRate,
    partialItems,
    lockScript,
    extraFlatFee: revealFeePadding,
  });
  const override =
    commitOutputValueOverride !== undefined &&
    commitOutputValueOverride !== null
      ? normalizeSats(commitOutputValueOverride, "commitOutputValueOverride")
      : null;
  const commitOutputValue = override ?? baseCommitValue + revealFee;

  const sortedUtxos = [...utxos].sort((a, b) => b.value - a.value);

  const nP2shOutputs = 1;
  const outputsSum = commitOutputValue;
  const dustThreshold = 100_000;
  const estVSize = (nIn: number, nOut: number): number =>
    10 + 148 * nIn + 34 * nOut;

  let selectedUtxos: any[] = [];
  let totalIn = 0;
  let feeEstimate = 0;

  for (const utxo of sortedUtxos) {
    if (typeof utxo.value !== "number") {
      throw new Error('Each utxo must include a numeric "value" (in koinu)');
    }
    selectedUtxos.push(utxo);
    totalIn += utxo.value;
    feeEstimate = Math.max(
      1,
      Math.floor(feeRate * estVSize(selectedUtxos.length, nP2shOutputs)),
    );
    const feeIfChange = Math.max(
      1,
      Math.floor(feeRate * estVSize(selectedUtxos.length, nP2shOutputs + 1)),
    );
    const needWithMaybeChange =
      outputsSum + Math.min(feeEstimate, feeIfChange) + dustThreshold;

    if (totalIn >= needWithMaybeChange) break;
  }

  if (totalIn < outputsSum + feeEstimate) {
    throw new Error(
      `Insufficient funds for commit: need at least ${outputsSum + feeEstimate}, have ${totalIn}.`,
    );
  }

  const inputsWithRawTx = await Promise.all(
    selectedUtxos.map(async (u) => ({
      utxo: u,
      raw: u.rawTxHex ?? (await fetchRawTransaction(u.txid)),
    })),
  );

  for (const { utxo: u, raw } of inputsWithRawTx) {
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      nonWitnessUtxo: Buffer.from(raw, "hex"),
    });
  }

  const script = p2shOutputScriptFromLock(lockScript);
  psbt.addOutput({ script, value: BigInt(commitOutputValue) });

  const nInputs = selectedUtxos.length;

  let fee = Math.max(1, Math.floor(feeRate * estVSize(nInputs, nP2shOutputs)));
  let change = totalIn - outputsSum - fee;

  if (change >= dustThreshold) {
    const feeWithChange = Math.max(
      1,
      Math.floor(feeRate * estVSize(nInputs, nP2shOutputs + 1)),
    );
    const changeWithFee = totalIn - outputsSum - feeWithChange;

    if (changeWithFee >= dustThreshold) {
      fee = feeWithChange;
      change = changeWithFee;
      psbt.addOutput({ address: changeAddress, value: BigInt(change) });
    } else {
      change = 0;
    }
  } else {
    change = 0;
  }

  if (totalIn < outputsSum + fee) {
    const shortfall = outputsSum + fee - totalIn;
    throw new Error(
      `Insufficient funds after fee calc: need ${outputsSum + fee}, have ${totalIn} (short by ${shortfall}).`,
    );
  }

  return psbt;
}

export async function buildChainedCommitTx({
  prevTxId,
  prevVout = 0,
  prevRawTx,
  lockScript,
  partialItems,
  nextLockScript,
  nextOutputValue,
  ephemeralWIF,
}: {
  prevTxId: string;
  prevVout?: number;
  prevRawTx: string;
  lockScript: Buffer;
  partialItems: any[];
  nextLockScript: Buffer;
  nextOutputValue: number;
  ephemeralWIF: string;
}) {
  const btc = await getBtc();
  const pair = await getECPair();
  const keyPair = pair.fromWIF(ephemeralWIF, pepeNetwork);

  const inputTxId = typeof prevTxId === "string" ? prevTxId : "";
  if (!/^[0-9a-fA-F]{64}$/.test(inputTxId)) {
    throw new Error("buildChainedCommitTx: invalid prevTxId");
  }
  if (!prevRawTx || typeof prevRawTx !== "string") {
    throw new Error("buildChainedCommitTx: prevRawTx is required");
  }
  if (!nextLockScript) {
    throw new Error("buildChainedCommitTx: nextLockScript is required");
  }

  const psbt = new btc.Psbt({ network: pepeNetwork });
  psbt.setVersion(1);

  psbt.addInput({
    hash: inputTxId,
    index: prevVout,
    nonWitnessUtxo: Buffer.from(prevRawTx, "hex"),
    redeemScript: lockScript,
  });

  const nextValue = normalizeSats(nextOutputValue, "nextOutputValue");
  const nextScript = p2shOutputScriptFromLock(nextLockScript);
  psbt.addOutput({ script: nextScript, value: BigInt(nextValue) });

  psbt.signInput(0, keyPair);

  psbt.finalizeInput(0, (_idx: any, input: any) => {
    const sig = input.partialSig?.[0]?.signature;
    if (!sig) throw new Error("Missing partialSig for chained commit input");
    if (!BTC) throw new Error("Bitcoinjs not initialised yet");
    const finalScriptSig = BTC.script.compile([
      ...partialItems,
      sig,
      lockScript,
    ]);
    return { finalScriptSig, finalScriptWitness: undefined };
  });

  psbt.setMaximumFeeRate(1_000_000);

  const tx = psbt.extractTransaction();
  return { hex: tx.toHex(), txid: tx.getId() };
}

export async function buildAndSignRevealTx({
  prevTxId,
  prevVout,
  prevRawTx,
  lockScript,
  partialItems,
  revealOutputValue,
  toAddress,
  ephemeralWIF,
  feeRate,
  revealFeePadding = REVEAL_EXTRA_FLAT_FEE_SATS,
}: {
  prevTxId: string;
  prevVout: number;
  prevRawTx: string;
  lockScript: Buffer;
  partialItems: any[];
  revealOutputValue: number;
  toAddress: string;
  ephemeralWIF: string;
  feeRate: number;
  revealFeePadding?: number;
}) {
  const btc = await getBtc();
  const pair = await getECPair();
  const keyPair = pair.fromWIF(ephemeralWIF, pepeNetwork);
  const { address: p2pkh } = btc.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: pepeNetwork,
  });
  if (!p2pkh) throw new Error("Failed to derive ephemeral P2PKH");

  const psbt = new btc.Psbt({ network: pepeNetwork });
  psbt.setVersion(1);

  const revealOutputSats = normalizeSats(
    revealOutputValue,
    "revealOutputValue",
  );
  const revealFee = calculateRevealFeeBudget({
    feeRate,
    partialItems,
    lockScript,
    extraFlatFee: revealFeePadding,
  });

  if (revealFee > 0) {
    const commitTx = btc.Transaction.fromHex(prevRawTx);
    const prevOut = commitTx.outs?.[prevVout];
    if (!prevOut) {
      throw new Error(`Commit transaction is missing output #${prevVout}`);
    }
    const prevValue = normalizeSats(prevOut.value, "commit output value");
    if (prevValue < revealOutputSats + revealFee) {
      throw new Error(
        `Commit output is underfunded for reveal: needs at least ${
          revealOutputSats + revealFee
        } sats, found ${prevValue} sats`,
      );
    }
  }
  psbt.addInput({
    hash: prevTxId,
    index: prevVout,
    nonWitnessUtxo: Buffer.from(prevRawTx, "hex"),
    redeemScript: lockScript,
  });

  psbt.addOutput({
    address: toAddress,
    value: BigInt(revealOutputSats),
  });

  psbt.signInput(0, keyPair);

  psbt.finalizeInput(0, (_idx: any, input: any) => {
    const sig = input.partialSig?.[0]?.signature;
    if (!sig) throw new Error("Missing partialSig for reveal");
    if (!BTC) throw new Error("Bitcoinjs not initialised yet");
    const finalScriptSig = BTC.script.compile([
      ...partialItems,
      sig,
      lockScript,
    ]);
    return { finalScriptSig, finalScriptWitness: undefined };
  });

  psbt.setMaximumFeeRate(1_000_000);

  const tx = psbt.extractTransaction();
  return tx.toHex();
}

const ECPairFac = ECPairFactory(ecc);

function withCharsetIfNeeded(type: any) {
  const normalized = typeof type === "string" ? type.trim() : "";
  if (!normalized) return "application/octet-stream";
  const lower = normalized.toLowerCase();
  const needsCharset =
    lower.startsWith("text/") ||
    lower === "application/json" ||
    lower === "application/javascript";
  if (needsCharset && !lower.includes("charset=")) {
    return `${normalized};charset=utf-8`;
  }
  return normalized;
}

export function resolveFileContentType(file: any) {
  if (!file) return "application/octet-stream";
  const declared = typeof file.type === "string" ? file.type.trim() : "";
  if (declared) {
    return withCharsetIfNeeded(declared);
  }
  const name = typeof file.name === "string" ? file.name.trim() : "";
  if (name) {
    const dotIndex = name.lastIndexOf(".");
    if (dotIndex !== -1 && dotIndex < name.length - 1) {
      const ext: FileExtension = name.slice(dotIndex + 1).toLowerCase();
      if (
        Object.prototype.hasOwnProperty.call(CONTENT_TYPE_BY_EXTENSION, ext)
      ) {
        return CONTENT_TYPE_BY_EXTENSION[ext];
      }
    }
  }
  return "application/octet-stream";
}

function normalizeRawHexPayload(rawHex: any, label: string): string {
  const trimmed = String(rawHex ?? "").trim();
  if (!trimmed) {
    throw new Error(`${label}: raw hex payload is empty`);
  }
  return trimmed;
}

// Function to broadcast the raw hex transaction to the Pepecoin node
async function broadcastRawHex(
  path: string,
  rawHex: any,
  { label = "broadcast", query }: { label?: string; query?: string } = {},
) {
  const trimmed = normalizeRawHexPayload(rawHex, label);
  // Ensure path always starts with `/`
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const endpoint = query
    ? `${normalizedPath}${query.startsWith("?") ? query : `?${query}`}`
    : normalizedPath;
  console.log("-------------------------", endpoint, trimmed);
  return axios.post(endpoint, trimmed, {
    headers: { "Content-Type": "text/plain" },
  });
}

// Pepecoin API object with a method to broadcast a transaction
function broadcastTransaction(rawHex: any, opts: any = {}) {
  const query = opts.allowHighFees ? "?allowHighFees=true" : "";
  return broadcastRawHex(`api/inscribe`, rawHex, {
    label: "pepecoinApi.broadcastTransaction",
    query,
  });
}

// Function to post the transaction to the Pepecoin node
async function postPepecoinTransaction(rawHex: any, options = {}) {
  return broadcastTransaction(rawHex, options);
}

// Function to broadcast the raw transaction core to Pepecoin
export async function broadcastRawTxCore(hex: any) {
  const bodyHex = String(hex ?? "")
    .trim()
    .replace(/^"|"$/g, "");

  if (!/^[0-9a-fA-F]+$/.test(bodyHex) || bodyHex.length % 2 !== 0) {
    throw new Error("broadcastRawTxCore: invalid raw tx hex");
  }
  if (bodyHex.startsWith("70736274ff") || bodyHex.startsWith("cHNidP")) {
    throw new Error("broadcastRawTxCore: got PSBT, need signed raw tx hex");
  }

  // Broadcasting the raw transaction
  const res: any = await postPepecoinTransaction(bodyHex);
  const data: any = res.data;
  // Handle the response
  if (data && typeof data === "object") {
    if (typeof data.txid === "string" && data.txid.length === 64) {
      return data.txid;
    }
    if (typeof data.result === "string" && data.result.length === 64) {
      return data.result;
    }
  }
  if (typeof data === "string" && data.length === 64) {
    return data;
  }

  throw new Error(
    `Pepecoin broadcast failed: unexpected response ${JSON.stringify(res)}`,
  );
}

async function isTxConfirmed(txid: any) {
  try {
    const res = await axios
      .get(`https://api2.dogepaywallet.space/tx/${txid}/status`)
      .then((r) => r.data);

    if (res && typeof res === "object") {
      if (typeof res.confirmed === "boolean") return res.confirmed;
      if (res.status && typeof res.status.confirmed === "boolean") {
        return res.status.confirmed;
      }
    }
  } catch (_err) {
    return false;
  }
  return false;
}

function wait(ms: any) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForRawTx(
  txid: any,
  {
    timeoutMs = 60_000,
    intervalMs = 1_500,
    jitterMs = 300,
    confirmed = false,
  } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;

  while (Date.now() < deadline) {
    try {
      const hex = await fetchRawTransaction(txid);
      if (typeof hex === "string" && /^[0-9a-fA-F]+$/.test(hex)) {
        if (!confirmed) {
          return hex;
        }
        const txConfirmed = await isTxConfirmed(txid);
        if (txConfirmed) return hex;
      }
    } catch (e) {
      lastErr = e;
    }

    const waitMs = intervalMs + Math.floor(Math.random() * jitterMs);
    await wait(waitMs);
  }

  throw new Error(
    `Raw tx not available for ${txid} after ${timeoutMs}ms. Last error: ${String(lastErr)}`,
  );
}

export async function signPsbtWithWallet(
  psbtBase64: any,
  privateKey: String,
  opts: any = {},
) {
  const wif: any = privateKey;
  const toSignInputs = Array.isArray(opts?.toSignInputs)
    ? opts.toSignInputs
        .map((entry: any) => (typeof entry === "number" ? entry : entry?.index))
        .filter((idx: any) => Number.isInteger(idx) && idx >= 0)
    : [];

  const psbt = bitcoinjs.Psbt.fromBase64(psbtBase64, { network: pepeNetwork });
  const keyPair = ECPairFac.fromWIF(wif.trim(), pepeNetwork);

  if (toSignInputs.length) {
    toSignInputs.forEach((idx: any) => {
      psbt.signInput(idx, keyPair);
    });
  } else {
    psbt.signAllInputs(keyPair);
  }

  return psbt.toBase64();
}
