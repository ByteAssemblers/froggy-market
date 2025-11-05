import * as bitcoinjs from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";
import { pepeNetwork as PEPE_NETWORK } from "./wallet/pepeNetwork";

import { fetchRawTransaction } from "./inscribe";
import axios from "axios";

const ECPair = ECPairFactory(ecc);

const CONTENT_TYPE_BY_EXTENSION: any = {
  txt: "text/plain;charset=utf-8",
  text: "text/plain;charset=utf-8",
  pepemap: "text/plain;charset=utf-8",
  pepe: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  html: "text/html;charset=utf-8",
  htm: "text/html;charset=utf-8",
  css: "text/css;charset=utf-8",
  js: "text/javascript;charset=utf-8",
  mjs: "text/javascript;charset=utf-8",
  jsx: "text/javascript;charset=utf-8",
  ts: "text/plain;charset=utf-8",
  tsx: "text/plain;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  markdown: "text/markdown;charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  pdf: "application/pdf",
  zip: "application/zip",
  gz: "application/gzip",
  wasm: "application/wasm",
};

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
      const ext = name.slice(dotIndex + 1).toLowerCase();
      if (
        Object.prototype.hasOwnProperty.call(CONTENT_TYPE_BY_EXTENSION, ext)
      ) {
        return CONTENT_TYPE_BY_EXTENSION[ext];
      }
    }
  }
  return "application/octet-stream";
}

//

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
  const endpoint = query
    ? `${path}${query.startsWith("?") ? query : `?${query}`}`
    : path;

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

//

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

//
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

  const psbt = bitcoinjs.Psbt.fromBase64(psbtBase64, { network: PEPE_NETWORK });
  const keyPair = ECPair.fromWIF(wif.trim(), PEPE_NETWORK);

  if (toSignInputs.length) {
    toSignInputs.forEach((idx: any) => {
      psbt.signInput(idx, keyPair);
    });
  } else {
    psbt.signAllInputs(keyPair);
  }

  return psbt.toBase64();
}
