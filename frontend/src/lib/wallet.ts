"use client";
import * as bip39 from "bip39";
import BIP32Factory from "bip32";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";
import { pepeNetwork } from "./pepeNetwork";

// Initialize factories
const ECPair = ECPairFactory(ecc);
const bip32 = BIP32Factory(ecc);

// Pepecoin derivation path (custom SLIP-44 index)
export const PEPECOIN_PATH = "m/44'/0'/0'/0";

export type HDWallet = {
  mnemonic: string;
  privateKey: string; // WIF
  publicKey: string; // hex
  address: string;
};

// Generate a new mnemonic + wallet
export async function generateHDWallet(): Promise<HDWallet> {
  const mnemonic = bip39.generateMnemonic(128); // 12 words
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = bip32.fromSeed(seed, pepeNetwork as any);
  const child = root.derivePath(PEPECOIN_PATH);

  const { address } = bitcoin.payments.p2pkh({
    pubkey: child.publicKey,
    network: pepeNetwork as any,
  });

  return {
    mnemonic,
    privateKey: child.toWIF(),
    publicKey: child.publicKey.toString(),
    address: address!,
  };
}

// Restore wallet from mnemonic phrase
export async function fromMnemonic(mnemonic: string): Promise<HDWallet> {
  const clean = mnemonic.trim();
  if (!bip39.validateMnemonic(clean)) {
    throw new Error("Invalid mnemonic phrase");
  }

  const seed = await bip39.mnemonicToSeed(clean);
  const root = bip32.fromSeed(seed, pepeNetwork as any);
  const child = root.derivePath(PEPECOIN_PATH);

  const { address } = bitcoin.payments.p2pkh({
    pubkey: child.publicKey,
    network: pepeNetwork as any,
  });

  return {
    mnemonic: clean,
    privateKey: child.toWIF(),
    publicKey: child.publicKey.toString(),
    address: address!,
  };
}

// ✅ Import wallet from a WIF private key
export function fromPrivateKey(wif: string): HDWallet {
  try {
    const keyPair = ECPair.fromWIF(wif.trim(), pepeNetwork as any);

    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: pepeNetwork as any,
    });

    return {
      mnemonic: "",
      privateKey: keyPair.toWIF(),
      publicKey: keyPair.publicKey.toString(),
      address: address!,
    };
  } catch (err) {
    throw new Error("Invalid private key (WIF)");
  }
}
