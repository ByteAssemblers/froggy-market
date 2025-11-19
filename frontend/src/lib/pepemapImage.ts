"use client";

const LABEL_REGEX = /([0-9a-z._-]{1,120}\.pepemap)/i;
const BLOCK_REGEX = /(\d{3,})/;

const BIG_GREEN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#00c853" />
</svg>
`.trim();

export const PEPEMAP_GREEN_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  BIG_GREEN_SVG
)}`;

const PEPEMAP_IMAGE_CACHE = new Map<number, string>();

function safeTrim(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function parseBlockNumberCandidate(candidate: any): number | null {
  if (candidate == null) return null;
  if (typeof candidate === "number") {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.trunc(numeric));
    }
    return null;
  }
  const text = safeTrim(candidate);
  if (!text) return null;
  const directNumeric = Number(text);
  if (Number.isFinite(directNumeric)) {
    return Math.max(0, Math.trunc(directNumeric));
  }
  const fromDigits = text.match(BLOCK_REGEX);
  if (fromDigits && fromDigits[1]) {
    const parsed = Number(fromDigits[1]);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.trunc(parsed));
    }
  }
  return null;
}

function extractLabelFromInscription(inscription: any): string | null {
  if (!inscription || typeof inscription !== "object") return null;
  const candidates = [
    inscription.content,
    inscription.pepemapLabel,
    inscription.pepemap,
    inscription.metadata?.pepemapLabel,
    inscription.metadata?.pepemap,
    inscription.metadata?.content,
    inscription.metadata?.fileName,
    inscription.metadata?.filename,
    inscription.metadata?.displayId,
    inscription.metadata?.label,
    inscription.metadata?.name,
    inscription.metadata?.title,
    inscription.title,
    inscription.name,
    inscription.label,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const text = safeTrim(candidate);
    if (!text) continue;
    const match = text.match(LABEL_REGEX);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function resolveBlockNumber(inscription: any): number | null {
  if (!inscription || typeof inscription !== "object") return null;

  const label = extractLabelFromInscription(inscription);
  const parsedLabel = parseBlockNumberCandidate(label);
  return parsedLabel != null ? parsedLabel : null;
}

/**
 * Get pepemap block number from inscription data
 */
export function getPepemapBlockNumber(inscription: any): number | null {
  return resolveBlockNumber(inscription);
}

/**
 * Get cached pepemap image URL
 */
export function getCachedPepemapImage(blockNumber: number): string | null {
  if (!Number.isFinite(blockNumber)) return null;
  return PEPEMAP_IMAGE_CACHE.get(blockNumber) || null;
}

/**
 * Fetch pepemap image from API and cache it
 */
export async function fetchPepemapImage(
  blockNumber: number,
  options: { signal?: AbortSignal } = {}
): Promise<string> {
  if (!Number.isFinite(blockNumber)) {
    throw new Error("Block number must be a finite number.");
  }

  const normalizedBlock = Math.max(0, Math.trunc(blockNumber));
  const cached = PEPEMAP_IMAGE_CACHE.get(normalizedBlock);
  if (cached) return cached;

  const controllerSignal = options.signal;
  const imageUrl = `/api/pepemaps/${normalizedBlock}.png`;
  const response = await fetch(imageUrl, {
    method: "GET",
    signal: controllerSignal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Failed to load pepemap image (${response.status}): ${text}`
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  PEPEMAP_IMAGE_CACHE.set(normalizedBlock, objectUrl);
  return objectUrl;
}

/**
 * Resolve pepemap preview - returns cached image or placeholder
 */
export function resolvePepemapPreview(inscription: any): string {
  const blockNumber = getPepemapBlockNumber(inscription);
  if (blockNumber != null) {
    const cached = getCachedPepemapImage(blockNumber);
    if (cached) {
      return cached;
    }
  }
  return PEPEMAP_GREEN_PLACEHOLDER;
}

/**
 * Clear all cached pepemap images
 */
export function clearPepemapImageCache(): void {
  for (const [, url] of PEPEMAP_IMAGE_CACHE.entries()) {
    try {
      URL.revokeObjectURL(url);
    } catch (err) {
      // ignore
    }
  }
  PEPEMAP_IMAGE_CACHE.clear();
}
