export const PEPE_PER_KB_FEE = 0.042;
export const MARKET_FEE = 2;
export const MIN_COMMIT_VALUE = 100_000;
export const RECOMMENDED_FEE = 0.042;
export const DEFAULT_COMMIT_PEP = 0.015;
export const MAX_INSCRIPTION_SIZE = 1 * 1024 * 1024;
export const CONTENT_TYPE_BY_EXTENSION = {
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
} as const;
export type FileExtension = keyof typeof CONTENT_TYPE_BY_EXTENSION;
export type MimeType = typeof CONTENT_TYPE_BY_EXTENSION[FileExtension];

export const REVEAL_EXTRA_FLAT_FEE_SATS = 1_000_000; // 0.01 PEP/DOGE in koinu
export const REVEAL_FEE_PADDING_SATS = REVEAL_EXTRA_FLAT_FEE_SATS; // backwards compatibility alias
export const DEFAULT_SIGNATURE_PUSH_BYTES = 73;
export const MAX_SCRIPT_CHUNK_BYTES = 240; // match legacy pepinals chunking to stay indexable
export const MAX_PARTIAL_SCRIPT_BYTES = 1_500; // limit scriptSig payload to avoid policy rejection
