"use client";
import { useEffect, useState } from "react";
import {
  generateHDWallet,
  fromMnemonic,
  fromPrivateKey,
} from "@/lib/wallet/wallet";
import { encryptWallet, decryptWallet } from "@/lib/wallet/storage";
import { getPepecoinBalance } from "@/lib/wallet/getBalance";

export default function PepecoinWallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [importText, setImportText] = useState("");
  const [walletPassword, setWalletPassword] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [hasSavedWallet, setHasSavedWallet] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  const [loadingBalance, setLoadingBalance] = useState(false);

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);

  // 🧩 Check if wallet exists in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pepecoin_wallet");
    if (stored) {
      const parsed = JSON.parse(stored);
      setHasSavedWallet(true);
      if (parsed.passwordProtected) {
        setIsLocked(true);
      } else {
        decryptWallet(parsed, "")
          .then((w) => setWallet(w))
          .catch(() => console.error("Auto-unlock failed"));
      }
    }
  }, []);

  async function handleGetBalance() {
    if (!wallet?.address) return;
    setLoadingBalance(true);
    const bal = await getPepecoinBalance(wallet.address);
    setBalance(bal);
    setLoadingBalance(false);
  }

  useEffect(() => {
    handleGetBalance();
  }, [wallet]);

  // 🪙 Create new wallet
  async function handleNewWallet() {
    const w = await generateHDWallet();
    setWallet(w);

    const encrypted = await encryptWallet(w, walletPassword || "");
    localStorage.setItem(
      "pepecoin_wallet",
      JSON.stringify({
        ...encrypted,
        passwordProtected: walletPassword.length > 0,
      }),
    );

    setHasSavedWallet(true);
    setIsLocked(walletPassword.length > 0);
    alert(
      walletPassword
        ? "Wallet created & locked with password"
        : "Wallet created (no password, auto unlocked)",
    );
  }

  // 🔓 Unlock wallet
  async function handleUnlock() {
    try {
      const stored = localStorage.getItem("pepecoin_wallet");
      if (!stored) return alert("No wallet found");
      const parsed = JSON.parse(stored);
      const w = await decryptWallet(parsed, walletPassword || "");
      setWallet(w);
      setIsLocked(false);
      alert("Wallet unlocked!");
    } catch {
      alert("Invalid password or corrupted data");
    }
  }

  // 🧹 Remove wallet
  function handleRemove() {
    localStorage.removeItem("pepecoin_wallet");
    setWallet(null);
    setImportText("");
    setWalletPassword("");
    setHasSavedWallet(false);
    setIsLocked(false);
    alert("Wallet removed");
  }

  // 🧩 Import mnemonic or private key automatically
  async function handleImport() {
    const value = importText.trim();
    try {
      let w;
      if (value.split(" ").length >= 12) {
        // Mnemonic
        w = await fromMnemonic(value);
      } else {
        // Private key
        w = fromPrivateKey(value);
      }

      setWallet(w);
      const encrypted = await encryptWallet(w, walletPassword || "");
      localStorage.setItem(
        "pepecoin_wallet",
        JSON.stringify({
          ...encrypted,
          passwordProtected: walletPassword.length > 0,
        }),
      );

      setHasSavedWallet(true);
      setIsLocked(walletPassword.length > 0);
      alert("Wallet imported and saved");
    } catch {
      alert("Invalid mnemonic or private key");
    }
  }

  // 🧱 Locked view
  if (isLocked && hasSavedWallet) {
    return (
      <div className="mx-auto mt-10 max-w-md space-y-4 rounded-lg border bg-black p-4 text-white">
        <h2 className="text-xl font-bold">🔒 Wallet Locked</h2>
        <input
          type="password"
          placeholder="Enter password to unlock"
          value={walletPassword}
          onChange={(e) => setWalletPassword(e.target.value)}
          className="w-full rounded border p-2"
        />
        <div className="flex space-x-2">
          <button
            onClick={handleUnlock}
            className="flex-1 rounded bg-blue-600 py-2 text-white"
          >
            Unlock
          </button>
          <button
            onClick={handleRemove}
            className="flex-1 rounded bg-red-600 py-2 text-white"
          >
            Remove Wallet
          </button>
        </div>
      </div>
    );
  }

  // 🧾 Normal unlocked view
  return (
    <div className="mx-auto mt-10 max-w-md space-y-4 rounded-lg border bg-black p-4 text-white">
      <h1 className="text-2xl font-bold">🐸 Pepecoin HD Wallet</h1>

      {!hasSavedWallet && (
        <>
          <input
            type="password"
            placeholder="Optional password"
            value={walletPassword}
            onChange={(e) => setWalletPassword(e.target.value)}
            className="w-full rounded border p-2"
          />
          <button
            onClick={handleNewWallet}
            className="w-full rounded bg-green-600 py-2 text-white"
          >
            Generate New Wallet
          </button>
        </>
      )}

      {/* 🔑 One textarea for both mnemonic or private key */}
      <div className="space-y-2">
        <label className="block text-sm">
          Import Mnemonic (12 words) or Private Key (WIF)
        </label>
        <textarea
          rows={3}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          className="w-full rounded border px-3 py-2 font-mono"
          placeholder="Paste your 12-word mnemonic or WIF private key here..."
        />
        <button
          onClick={handleImport}
          className="w-full rounded bg-blue-600 py-2 text-white"
        >
          Import Wallet
        </button>
      </div>

      {wallet && (
        <>
          <div className="mt-4 space-y-2">
            <div>
              <b>Address:</b> {wallet.address}
            </div>
            <div>
              <b>Public Key:</b> {wallet.publicKey}
            </div>
            <div>
              <b>Private Key:</b> {wallet.privateKey}
            </div>
            {wallet.mnemonic && (
              <div>
                <b>Mnemonic:</b> {wallet.mnemonic}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <b>Pepe Balance:</b>{" "}
                {balance !== null ? `${balance} PEPE` : "—"}
              </div>
              <button
                onClick={handleGetBalance}
                disabled={loadingBalance}
                className={`rounded bg-yellow-500 px-3 py-1 text-sm hover:bg-yellow-400 ${
                  loadingBalance ? "cursor-not-allowed opacity-70" : ""
                }`}
              >
                {loadingBalance ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            <button
              onClick={handleRemove}
              className="mt-4 w-full rounded bg-red-600 py-2 text-white"
            >
              Remove Wallet
            </button>
          </div>
        </>
      )}
    </div>
  );
}
