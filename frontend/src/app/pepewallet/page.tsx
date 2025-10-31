'use client';
import { useState } from 'react';
import { generateHDWallet, fromMnemonic, fromPrivateKey } from '@/lib/wallet';

export default function HDWalletPage() {
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [wallet, setWallet] = useState<any>(null);

  async function handleNew() {
    const w = await generateHDWallet();
    setMnemonic(w.mnemonic);
    setWallet(w);
  }

  async function handleImportMnemonic() {
    try {
      const w = await fromMnemonic(mnemonic);
      setWallet(w);
    } catch {
      alert('Invalid mnemonic');
    }
  }

  function handleImportPrivate() {
    try {
      const w = fromPrivateKey(privateKey);
      setWallet(w);
    } catch {
      alert('Invalid private key');
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Pepecoin HD Wallet</h1>

      {/* Generate new */}
      <button
        onClick={handleNew}
        className="px-3 py-2 rounded bg-green-600 text-white"
      >
        Generate New
      </button>

      {/* Mnemonic Import */}
      <div className="space-y-2">
        <label className="block text-sm">Mnemonic Phrase</label>
        <textarea
          rows={3}
          value={mnemonic}
          onChange={(e) => setMnemonic(e.target.value)}
          className="w-full border rounded px-3 py-2 font-mono"
        />
        <button
          onClick={handleImportMnemonic}
          className="px-3 py-2 rounded bg-blue-600 text-white"
        >
          Import Mnemonic
        </button>
      </div>

      {/* Private Key Import */}
      <div className="space-y-2">
        <label className="block text-sm">Private Key (WIF)</label>
        <input
          type="text"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          className="w-full border rounded px-3 py-2 font-mono"
        />
        <button
          onClick={handleImportPrivate}
          className="px-3 py-2 rounded bg-purple-600 text-white"
        >
          Import Private Key
        </button>
      </div>

      {wallet && (
        <div className="mt-4 space-y-2">
          <div><b>Address:</b> {wallet.address}</div>
          <div><b>Public Key:</b> {wallet.publicKey}</div>
          <div><b>Private Key (WIF):</b> {wallet.privateKey}</div>
        </div>
      )}
    </div>
  );
}
