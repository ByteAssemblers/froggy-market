'use client';

// --- Derive AES key from password ---
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();

  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBuffer = new Uint8Array(salt); // clone to valid BufferSource

  // Derive AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// --- Encrypt wallet object ---
export async function encryptWallet(wallet: any, password: string) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const data = enc.encode(JSON.stringify(wallet));

  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(cipher))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt)),
    address: wallet.address,
  };
}

// --- Decrypt wallet object ---
export async function decryptWallet(stored: any, password: string) {
  const dec = new TextDecoder();
  const salt = Uint8Array.from(atob(stored.salt), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(stored.iv), (c) => c.charCodeAt(0));
  const encrypted = Uint8Array.from(atob(stored.encrypted), (c) => c.charCodeAt(0));

  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);

  return JSON.parse(dec.decode(decrypted));
}
