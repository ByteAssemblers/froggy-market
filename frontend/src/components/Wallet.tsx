"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@radix-ui/react-popover";
import {
  Eye,
  EyeOff,
  RefreshCw,
  EllipsisVertical,
  ArrowUpRight,
  Key,
  Trash,
  ChevronLeft,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/ui/copybutton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyAddress } from "@/components/ui/copyaddress";
import { Spinner } from "@/components/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  generateHDWallet,
  fromMnemonic,
  fromPrivateKey,
} from "@/lib/wallet/wallet";
import { encryptWallet, decryptWallet } from "@/lib/wallet/storage";
import { getPepecoinBalance } from "@/lib/wallet/getBalance";
import { sendPepeTransaction } from "@/lib/wallet/sendPepe";
import { useProfile } from "@/hooks/useProfile";
import { apiClient } from "@/lib/axios";
import Link from "next/link";
import Avatar from "./Avatar";
import { PepemapImage } from "@/app/wallet/[address]/page";
import { toast } from "sonner";

const ORD_API_BASE = process.env.NEXT_PUBLIC_ORD_API_BASE!;

export default function Wallet() {
  const queryClient = useQueryClient();
  const [wallet, setWallet] = useState<any>(null);
  const [mnemonic, setMnemonic] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [importText, setImportText] = useState("");
  const [walletPassword, setWalletPassword] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [hasSavedWallet, setHasSavedWallet] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    null | "showSecrets" | "backup"
  >(null);
  const [hasBackedUp, setHasBackedUp] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState("");
  const [showLockPassword, setShowLockPassword] = useState(false);
  const [walletState, setWalletState] = useState<
    "empty" | "password" | "import" | "secret" | "mywallet" | "send" | "lock"
  >("empty");

  const {
    pepecoinPrice,
    walletInfo,
    myWalletNft,
    inscriptions,
    listingStatuses,
    pepemapListingStatuses,
    myWalletPrc20,
    myWalletPepemaps,
    isMyWalletNftLoading,
    isMyWalletPrc20Loading,
    isMyWalletPepemapsLoading,
    pepemapInfo,
    isPepemapInfoLoading,
    prc20Info,
    isPrc20InfoLoading,
    collectionInfo,
    isCollectionInfoLoading,
    prc20ListingStatuses,
  } = useProfile();

  const grouped = [...listingStatuses.values()].reduce((groups, item) => {
    const collection = item.listing?.inscription?.collection;

    if (!collection) return groups;

    const name = collection.name;

    if (!groups[name]) {
      groups[name] = {
        collection,
        items: [],
      };
    }

    groups[name].items.push(item);

    return groups;
  }, {});

  const isLoading =
    isMyWalletNftLoading ||
    isMyWalletPrc20Loading ||
    isMyWalletPepemapsLoading ||
    isPepemapInfoLoading ||
    isPrc20InfoLoading ||
    isCollectionInfoLoading;

  // pepemaps total
  const pepemapTotal =
    (pepemapInfo?.floorPrice || 0) * myWalletPepemaps?.length;

  // nft collections total
  const collectionsTotal = Object.values(grouped).reduce(
    (sum: number, group: any) => {
      const floor =
        collectionInfo.find((i: any) => i.symbol === group.collection.symbol)
          ?.floorPrice || 0;

      return sum + floor * group.items.length;
    },
    0,
  );

  // final total
  const totalNftValue = pepemapTotal + collectionsTotal;

  const totalPrcValue = myWalletPrc20?.reduce((sum: any, item: any) => {
    const info = prc20Info?.find((i: any) => i.tick === item.tick);
    if (!info) return sum;

    const amount = Number(item.balance) + Number(item.transferable_balance);

    return sum + info.floorPrice * amount;
  }, 0);

  useEffect(() => {
    const stored = localStorage.getItem("pepecoin_wallet");
    const backedUp = localStorage.getItem("pepecoin_wallet_backed_up");
    if (backedUp === "true") setHasBackedUp(true);

    if (stored) {
      const parsed = JSON.parse(stored);
      setHasSavedWallet(true);

      if (parsed.passwordProtected) {
        setIsLocked(true);
        setWalletState("lock");
      } else {
        decryptWallet(parsed, "")
          .then((w) => {
            setWallet(w);
            setWalletAddress(w.address);
            setMnemonic(w.mnemonic);
            setPrivateKey(w.privateKey);
            setWalletState("mywallet");
          })
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

  async function handleNewWallet(pwd = "") {
    const w = await generateHDWallet();

    // Clean any previous wallet first
    localStorage.removeItem("pepecoin_wallet");

    const encrypted = await encryptWallet(w, pwd);
    localStorage.setItem(
      "pepecoin_wallet",
      JSON.stringify({
        ...encrypted,
        passwordProtected: pwd.length > 0,
      }),
    );

    setWallet(w);
    setHasSavedWallet(true);
    setIsLocked(pwd.length > 0);
    setWalletAddress(w.address);
    setMnemonic(w.mnemonic);
    setPrivateKey(w.privateKey);

    // 💾 Save unlocked wallet to session storage
    sessionStorage.setItem("pepecoin_wallet_unlocked", JSON.stringify(w));

    // 🔄 Update global wallet state
    walletInfo();
  }

  function handleRemove() {
    localStorage.removeItem("pepecoin_wallet");
    localStorage.removeItem("pepecoin_wallet_backed_up");
    setHasBackedUp(false);
    setWallet(null);
    setImportText("");
    setWalletPassword("");
    setHasSavedWallet(false);
    setIsLocked(false);
    setWalletAddress("");
    setMnemonic("");
    setPrivateKey("");
    setPassword("");
    setConfirmPassword("");
    setLockPassword("");
    setError("");
    setLockError("");
    setWalletState("empty");
  }

  async function handleImport(pwd = "") {
    const value = importText.trim();
    try {
      let w;
      if (value.split(" ").length >= 12) {
        w = await fromMnemonic(value);
      } else {
        w = fromPrivateKey(value);
      }

      setWallet(w);
      const encrypted = await encryptWallet(w, pwd);
      localStorage.setItem(
        "pepecoin_wallet",
        JSON.stringify({
          ...encrypted,
          passwordProtected: pwd.length > 0,
        }),
      );

      setHasSavedWallet(true);
      setIsLocked(pwd.length > 0);
      setWalletAddress(w.address);
      setMnemonic(w.mnemonic);
      setPrivateKey(w.privateKey);

      // 💾 Save unlocked wallet to session storage
      sessionStorage.setItem("pepecoin_wallet_unlocked", JSON.stringify(w));

      // 🔄 Update global wallet state
      walletInfo();
    } catch {
      setError("invalid import");
    }
  }

  async function handleSend() {
    if (!wallet?.privateKey) return;
    if (!recipient || !amount) return;

    setSending(true);
    try {
      const txid = await sendPepeTransaction(
        wallet.privateKey,
        recipient,
        parseFloat(amount),
      );
      toast.success(`Transaction sent!\nTXID: ${txid}`);
      setRecipient("");
      setAmount("");
      await handleGetBalance(); // refresh after sending
    } catch (err: any) {
      toast.error(`Send failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  function handleSkipPassword(pwd?: string) {
    const passwordToUse = pwd || walletPassword;
    importText === ""
      ? handleNewWallet(passwordToUse)
      : handleImport(passwordToUse);
    setWalletState("mywallet");
  }

  const handleSetPassword = () => {
    if (!password) return setError("Please enter a password");
    if (password.length < 6)
      return setError("Password must be at least 6 characters");
    if (password !== confirmPassword) return setError("Passwords don't match");

    setError("");
    handleSkipPassword(password); // ✅ use password immediately
  };

  async function handleUnlockPassword() {
    if (!lockPassword) {
      return setLockError("Please enter a password");
    }

    try {
      const stored = localStorage.getItem("pepecoin_wallet");
      if (!stored) {
        return setLockError("No wallet found");
      }

      const parsed = JSON.parse(stored);

      let w;
      try {
        w = await decryptWallet(parsed, lockPassword);
      } catch {
        setLockError("Incorrect password");
        return;
      }

      if (!w) {
        setLockError("Incorrect password");
        return;
      }

      // ✅ Successful unlock
      setWallet(w);
      setWalletAddress(w.address);
      setMnemonic(w.mnemonic);
      setPrivateKey(w.privateKey);
      setIsLocked(false);
      setLockPassword("");
      setLockError("");

      // 💾 Save unlocked wallet to session storage so useProfile can access it
      sessionStorage.setItem("pepecoin_wallet_unlocked", JSON.stringify(w));
      console.log("💾 Unlocked wallet saved to session storage");

      // 🔄 Update global wallet state (this triggers InscribeHistory refresh!)
      walletInfo();
      console.log("✅ Wallet unlocked and global state updated");

      // 🔁 Check pending action
      if (pendingAction === "showSecrets" || pendingAction === "backup") {
        setPendingAction(null);
        setWalletState("secret");
      } else {
        setWalletState("mywallet");
      }
    } catch {
      setLockError("Something went wrong while unlocking");
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem("pepecoin_wallet");
    if (stored) {
      const parsed = JSON.parse(stored);
      setHasSavedWallet(true);

      if (parsed.passwordProtected) {
        setIsLocked(true);
        setWalletState("lock"); // ✅ add this line directly here
      } else {
        decryptWallet(parsed, "")
          .then((w) => {
            setWallet(w);
            setWalletAddress(w.address);
            setMnemonic(w.mnemonic);
            setPrivateKey(w.privateKey);
            setWalletState("mywallet");
          })
          .catch(() => console.error("Auto-unlock failed"));
      }
    }
  }, []);

  useEffect(() => {
    if (walletState === "secret") {
      localStorage.setItem("pepecoin_wallet_backed_up", "true");
      setHasBackedUp(true);
    }
  }, [walletState]);

  // Collect all listed items grouped by type
  const listedPepemaps = [...pepemapListingStatuses.entries()]
    .filter(([_, data]) => data.status === "listed")
    .map(([inscriptionId, data]) => ({
      inscriptionId,
      ...data,
      type: "pepemap",
    }))
    .sort(
      (a, b) =>
        new Date(b.listing?.createdAt).getTime() -
        new Date(a.listing?.createdAt).getTime(),
    );

  const listedNfts = [...listingStatuses.entries()]
    .filter(([_, data]) => data.status === "listed")
    .map(([inscriptionId, data]) => ({
      inscriptionId,
      ...data,
      type: "nft",
    }))
    .sort(
      (a, b) =>
        new Date(b.listing?.createdAt).getTime() -
        new Date(a.listing?.createdAt).getTime(),
    );

  const listedPrc20s = [...prc20ListingStatuses.entries()]
    .filter(([_, data]) => data.status === "listed")
    .map(([inscriptionId, data]) => ({
      inscriptionId,
      ...data,
      type: "prc20",
    }))
    .sort(
      (a, b) =>
        new Date(b.listing?.createdAt).getTime() -
        new Date(a.listing?.createdAt).getTime(),
    );

  const hasListings =
    listedPepemaps.length > 0 ||
    listedNfts.length > 0 ||
    listedPrc20s.length > 0;

  // Unlist handlers
  const handleNftUnlist = async (inscriptionId: string) => {
    try {
      await apiClient.post("/listings/unlist", {
        inscriptionId,
        sellerAddress: walletAddress,
      });

      toast.success("NFT unlisted successfully!");
      // Refresh the wallet data using React Query
      await queryClient.invalidateQueries({
        queryKey: ["myWalletNft", walletAddress],
        refetchType: "active",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(
        `Failed to unlist: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  const handlePepemapUnlist = async (inscriptionId: string) => {
    try {
      await apiClient.post("/pepemap-listings/unlist", {
        inscriptionId,
        sellerAddress: walletAddress,
      });

      toast.success("Pepemap unlisted successfully!");
      // Refresh the wallet data using React Query
      await queryClient.invalidateQueries({
        queryKey: ["myWalletPepemaps", walletAddress],
        refetchType: "active",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(
        `Failed to unlist: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  const handlePrcUnlist = async (inscriptionId: string) => {
    try {
      await apiClient.post("/prc20-listings/unlist", {
        inscriptionId,
        sellerAddress: walletAddress,
      });

      toast.success("Transfer unlisted successfully!");
      // Refresh the wallet data using React Query
      await queryClient.invalidateQueries({
        queryKey: ["myWalletPrc20", walletAddress],
        refetchType: "active",
      });
    } catch (error: any) {
      console.error(error);
      toast.error(
        `Failed to unlist: ${error.response?.data?.message || error.message}`,
      );
    }
  };

  const isValidAddress =
    recipient.startsWith("P") &&
    recipient.length >= 26 &&
    recipient.length <= 64;
  const isValidAmount = Number(amount) > 0;
  const hasEnoughBalance = balance !== null && Number(amount) <= balance;

  let sendButtonText = "Send";
  let sendButtonDisabled = false;

  if (!isValidAddress) {
    sendButtonText = "Enter valid address";
    sendButtonDisabled = true;
  } else if (!isValidAmount) {
    sendButtonText = "Enter valid amount";
    sendButtonDisabled = true;
  } else if (!hasEnoughBalance) {
    sendButtonText = "Not enough balance";
    sendButtonDisabled = true;
  }

  return (
    <Popover>
      <PopoverTrigger asChild className="relative backdrop-blur-[20px]">
        <Button className="flex h-11 items-center gap-0 border border-transparent bg-[#ffffff1f] px-4 py-1 font-bold text-white hover:border-[#ffffff52] hover:bg-transparent">
          <span className="relative leading-none">
            <Image
              src="/assets/icons/wallet.svg"
              width={30}
              height={30}
              alt="mail"
            />
          </span>
          <span className="ml-2.5 hidden text-[16px] whitespace-nowrap md:flex">
            {walletAddress == ""
              ? "Open wallet"
              : `${walletAddress.slice(0, 5)}...${walletAddress.slice(-5)}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end">
        <div className="visible z-9990 mt-2 max-w-[calc(100vw-10px)]">
          <div className="transition-visibility relative flex max-h-120 min-h-80 w-[min(400px,calc(100vw-1.5rem))] max-w-[400px] overflow-y-auto overscroll-contain rounded-xl bg-[#ffffff1a] leading-[1.4] whitespace-normal text-white backdrop-blur-[42px] transition-transform duration-200 outline-none">
            <div className="relative z-1 flex w-full p-4 duration-200">
              <div className="flex w-full flex-col">
                {walletState === "empty" && (
                  <>
                    <div className="mb-4 text-center text-[1.4rem]">
                      FroggyMarket Wallet
                    </div>
                    <div className="text-[90%] leading-[1.2]">
                      FroggyMarket comes with built-in wallet, there is no need
                      to download any browser extension. Your private keys are
                      stored in the browser and are never sent to the server.
                    </div>
                    <div className="mt-6 p-4">
                      <button
                        onClick={() => setWalletState("password")}
                        className="font-inherit mb-4 w-full cursor-pointer rounded-xl border border-transparent bg-white px-4 py-[0.7rem] text-[1em] font-medium text-black transition-all duration-200 ease-in-out hover:bg-[#dedede]"
                      >
                        Create new wallet
                      </button>
                      <button
                        onClick={() => setWalletState("import")}
                        className="font-inherit w-full cursor-pointer rounded-xl border border-transparent bg-[#dbbdf9] px-4 py-2 text-[1em] font-medium text-[#8000ff] transition-all duration-200 ease-in-out hover:bg-[#c28bfa]"
                      >
                        Import wallet
                      </button>
                    </div>
                  </>
                )}
                {walletState === "password" && (
                  <>
                    <div className="my-4 text-center text-[1.2rem]">
                      Set your wallet password
                    </div>
                    <div className="my-2 flex rounded-md border border-white">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="font-inherit w-full border-none bg-transparent py-2.5 pl-[0.6em] text-inherit outline-none active:border"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="inline-block cursor-pointer overflow-hidden bg-transparent p-[0.6em]"
                      >
                        {showPassword ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </button>
                    </div>
                    <div className="my-2 flex rounded-md border border-white">
                      <input
                        id="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="font-inherit w-full border-none bg-transparent py-2.5 pl-[0.6em] text-inherit outline-none active:border"
                        placeholder="Confirm password"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="inline-block cursor-pointer overflow-hidden bg-transparent p-[0.6em]"
                      >
                        {showConfirmPassword ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </button>
                    </div>
                    {error && (
                      <div className="text-[95%] text-[#ff4500]">{error}</div>
                    )}
                    <div className="mt-auto">
                      <Button
                        onClick={() => handleSkipPassword()}
                        className="font-inherit cursor-pointer rounded-xl border-2 border-white bg-transparent bg-none px-4 py-5 text-[1em] font-medium text-white transition-all duration-200 ease-in-out hover:text-black"
                      >
                        Skip
                      </Button>
                      <Button
                        onClick={handleSetPassword}
                        className="font-inherit ml-4 cursor-pointer rounded-xl border border-transparent bg-white px-4 py-5 text-[1em] font-medium text-black transition-all duration-200 ease-in-out"
                      >
                        Set password
                      </Button>
                    </div>
                  </>
                )}
                {walletState === "import" && (
                  <>
                    <div className="my-1 text-center text-[1.2rem] font-semibold">
                      Import wallet
                    </div>
                    <div className="mt-2 mb-2 rounded-xl bg-[#ffe10026] px-[0.8rem] py-[0.4rem] text-[0.85rem] leading-[1.2] font-semibold text-[gold]">
                      Before you enter your seed phrase always verify that URL
                      address is&#xA0;
                      <span className="font-bold">froggy.market</span>
                    </div>
                    <Textarea
                      className="font-inherit my-2 h-32 w-full resize-none rounded-lg border-none bg-white/10 p-2.5 text-sm font-light"
                      placeholder="Enter your secret phrase here (mnemonic or private key)"
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                    ></Textarea>
                    {error && (
                      <div className="mb-4 text-[95%] text-[#ff4500]">
                        Invalid seed phrase
                      </div>
                    )}
                    <div className="mt-auto">
                      <Button
                        onClick={() => setWalletState("empty")}
                        className="font-inherit cursor-pointer rounded-xl border-2 border-white bg-transparent bg-none px-4 py-5 text-[1em] font-medium text-white transition-all duration-200 ease-in-out hover:text-black"
                      >
                        Go back
                      </Button>
                      <Button
                        onClick={() => setWalletState("password")}
                        className="font-inherit ml-4 cursor-pointer rounded-xl border border-transparent bg-white px-4 py-5 text-[1em] font-medium text-black transition-all duration-200 ease-in-out"
                      >
                        Import wallet
                      </Button>
                    </div>
                  </>
                )}
                {walletState === "secret" && (
                  <>
                    <div className="text-[1.2rem]">Your secret phrase:</div>

                    {mnemonic ? (
                      <div
                        className="mx-4 my-2 grid grid-cols-2 gap-x-2 gap-y-2"
                        translate="no"
                      >
                        {mnemonic.split(" ").map((item, index) => (
                          <div
                            key={index}
                            className="flex w-32 overflow-hidden rounded-md bg-[#202225]"
                          >
                            <div className="w-10 bg-[#2c2f33] px-1 py-[0.1rem] text-center select-none">
                              {index + 1}
                            </div>
                            <div className="px-[0.4rem] py-[0.1rem]">
                              {item}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div translate="no" className="wrap-anywhere">
                        {privateKey}
                      </div>
                    )}

                    <div className="mt-4 mb-6 flex justify-center">
                      <CopyButton
                        text={mnemonic ? mnemonic : privateKey}
                        showText
                      />
                    </div>
                    <div className="mb-4 rounded-xl bg-black/20 p-2 text-[0.8rem]">
                      Anyone who knows these words can access your funds. Before
                      importing to other wallet make sure it supports pepinals
                      protocol.
                    </div>
                    <div className="mt-auto">
                      {hasBackedUp ? (
                        <Button
                          onClick={() => setWalletState("mywallet")}
                          className="font-inherit cursor-pointer rounded-xl border border-transparent bg-[#1a1a1a] px-6 py-3 text-[1em] font-medium text-white transition-all duration-200 ease-in-out hover:bg-[#222]"
                        >
                          Go back
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => setWalletState("mywallet")}
                            className="font-inherit cursor-pointer rounded-xl border-2 border-white bg-transparent bg-none px-6 py-3 text-[1em] font-medium text-white transition-all duration-200 ease-in-out hover:text-black"
                          >
                            Go back
                          </Button>
                          <Button
                            onClick={() => {
                              localStorage.setItem(
                                "pepecoin_wallet_backed_up",
                                "true",
                              );
                              setHasBackedUp(true);
                              setWalletState("mywallet");
                            }}
                            className="font-inherit ml-3 cursor-pointer rounded-xl border border-transparent bg-white px-6 py-3 text-[1em] font-medium text-black transition-all duration-200 ease-in-out"
                          >
                            I’ve saved these words
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
                {walletState === "mywallet" && (
                  <>
                    <div className="flex items-start">
                      <span className="flex cursor-pointer rounded-sm px-[4.6rem] py-[0.3rem]">
                        <CopyAddress text={walletAddress} showText />
                      </span>
                      <div className="mt-1 ml-auto flex">
                        <button
                          onClick={handleGetBalance}
                          disabled={loadingBalance}
                          className="font-inherit cursor-pointer rounded-full border-0 bg-none p-1 text-[0.9rem] leading-0 font-medium text-white transition-all duration-150 ease-in-out hover:bg-[#202225]"
                        >
                          {loadingBalance ? (
                            <Spinner className="size-6" />
                          ) : (
                            <RefreshCw />
                          )}
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="font-inherit cursor-pointer rounded-full border-0 bg-none p-1 text-[0.9rem] leading-0 font-medium text-white transition-all duration-150 ease-in-out hover:bg-[#202225]">
                              <EllipsisVertical />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="z-9999 w-44 border border-neutral-700 bg-black p-2 text-white shadow-lg"
                          >
                            <DropdownMenuItem
                              onClick={() => setWalletState("send")}
                              className="text-md cursor-pointer rounded-md px-1 py-2 transition-all duration-150 ease-linear"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                              <span>Send pepe</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const stored =
                                  localStorage.getItem("pepecoin_wallet");
                                if (!stored) return;

                                const parsed = JSON.parse(stored);
                                if (parsed.passwordProtected) {
                                  setPendingAction("showSecrets");
                                  setWalletState("lock");
                                } else {
                                  setWalletState("secret");
                                }
                              }}
                              className="text-md cursor-pointer rounded-md px-1 py-2 transition-all duration-150 ease-linear"
                            >
                              <Key className="h-4 w-4" />
                              <span>Show secrets</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={handleRemove}
                              className="text-md cursor-pointer rounded-md px-1 py-2 text-[tomato] transition-all duration-150 ease-linear"
                            >
                              <Trash className="h-4 w-4 text-[tomato]" />
                              <span className="text-[tomato] hover:text-[tomato]">
                                Remove wallet
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="my-2">
                      <div>
                        <span className="flex font-bold">
                          <Image
                            src="/assets/coin.gif"
                            alt="coin"
                            width={18}
                            height={18}
                            priority
                            className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                          />
                          {balance?.toFixed(2)}&#xA0;
                          <span className="text-[#fffc]">
                            (${(Number(balance) * pepecoinPrice).toFixed(2)})
                          </span>
                        </span>
                      </div>
                    </div>
                    {!hasBackedUp && (
                      <div className="text-[90%]">
                        Your wallet needs backup&#xA0;
                        <span
                          onClick={() => {
                            const stored =
                              localStorage.getItem("pepecoin_wallet");
                            if (!stored) return;

                            const parsed = JSON.parse(stored);
                            if (parsed.passwordProtected) {
                              setPendingAction("backup");
                              setWalletState("lock"); // go to password input first
                            } else {
                              setWalletState("secret"); // open secrets directly if unlocked
                            }
                          }}
                          className="cursor-pointer font-semibold text-[#c891ff] decoration-inherit"
                        >
                          Backup now
                        </span>
                      </div>
                    )}
                    <Tabs defaultValue="assets">
                      <TabsList className="m-1 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
                        <div className="scrollbar-none my-1 flex overflow-x-auto text-[90%] select-none">
                          <TabsTrigger value="assets">Assets</TabsTrigger>
                          <TabsTrigger value="listings">Listings</TabsTrigger>
                        </div>
                      </TabsList>
                      <TabsContent value="assets" className="flex flex-col">
                        {isLoading ? (
                          <Spinner className="m-auto size-6" />
                        ) : (
                          myWalletPepemaps &&
                          myWalletPrc20 &&
                          myWalletNft && (
                            <>
                              {[...listingStatuses.values()].length != 0 ||
                              myWalletPepemaps.length != 0 ||
                              myWalletPrc20.length != 0 ? (
                                <>
                                  {([...listingStatuses.values()].length != 0 ||
                                    myWalletPepemaps.length != 0) && (
                                    <>
                                      <div className="my-1 flex items-center justify-between px-1 font-bold">
                                        <div>NFTs</div>
                                        <div className="font-medium">
                                          <div className="flex">
                                            <Image
                                              src="/assets/coin.gif"
                                              alt="coin"
                                              width={18}
                                              height={18}
                                              priority
                                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                            />
                                            {totalNftValue}
                                          </div>
                                        </div>
                                      </div>
                                      <>
                                        {myWalletPepemaps.length != 0 && (
                                          <Link
                                            href={`/wallet/${walletAddress}?tab=pepemaps`}
                                            className="mb-2 flex cursor-pointer items-center justify-start gap-3 rounded-[18px] border border-transparent bg-[#0000004d] px-3 py-2 text-[1.1rem] leading-[1.2] transition-all duration-200 ease-in-out hover:bg-[#00000080]"
                                          >
                                            <PepemapImage
                                              item={inscriptions.find(
                                                (i: any) =>
                                                  i.inscription_id ==
                                                  myWalletPepemaps[0]
                                                    .inscription_id,
                                              )}
                                              sm
                                            />
                                            <div className="min-w-0">
                                              <div className="mb-1 overflow-hidden text-[1.1rem] font-semibold text-ellipsis whitespace-nowrap text-white">
                                                Pepemaps
                                              </div>
                                              <div className="flex items-center gap-[0.3rem] text-[0.9rem] font-medium">
                                                <span className="rounded-[6px] bg-[#00c85345] px-[0.3rem] py-[0.03rem] text-[#00c853]">
                                                  {myWalletPepemaps.length}
                                                </span>
                                                {[
                                                  ...pepemapListingStatuses.values(),
                                                ].filter(
                                                  (v) => v.status === "listed",
                                                ).length != 0 && (
                                                  <span className="inline-flex items-center gap-[0.2rem] rounded-[6px] bg-[#1e90ff33] px-[0.3rem] py-[0.03rem] text-[#1e90ff]">
                                                    <Image
                                                      src="/assets/icons/arrow-tilt.svg"
                                                      width={16}
                                                      height={16}
                                                      alt="arrow-tilt"
                                                    />
                                                    {
                                                      [
                                                        ...pepemapListingStatuses.values(),
                                                      ].filter(
                                                        (v) =>
                                                          v.status === "listed",
                                                      ).length
                                                    }
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            {pepemapInfo?.floorPrice != 0 && (
                                              <div className="ml-auto text-right whitespace-nowrap">
                                                <div className="flex">
                                                  <Image
                                                    src="/assets/coin.gif"
                                                    alt="coin"
                                                    width={18}
                                                    height={18}
                                                    priority
                                                    className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                                  />
                                                  {pepemapInfo?.floorPrice *
                                                    myWalletPepemaps.length}
                                                </div>
                                              </div>
                                            )}
                                          </Link>
                                        )}
                                        {[...listingStatuses.values()].length !=
                                          0 && (
                                          <>
                                            {Object.values(grouped).map(
                                              (item: any, index: number) => (
                                                <Link
                                                  key={index}
                                                  href={`/wallet/${walletAddress}?tab=nfts`}
                                                  className="mb-2 flex cursor-pointer items-center justify-start gap-3 rounded-[18px] border border-transparent bg-[#0000004d] px-3 py-2 text-[1.1rem] leading-[1.2] transition-all duration-200 ease-in-out hover:bg-[#00000080]"
                                                >
                                                  <Image
                                                    src={`${ORD_API_BASE}/content/${item.collection.profileInscriptionId}`}
                                                    alt={`Inscription #${item.collection.profileInscriptionId}`}
                                                    width={32}
                                                    height={32}
                                                    className="h-12 w-12 shrink-0 rounded-xl object-cover [image-rendering:pixelated]"
                                                    unoptimized
                                                  />
                                                  <div className="min-w-0">
                                                    <div className="mb-1 overflow-hidden text-[1.1rem] font-semibold text-ellipsis whitespace-nowrap text-white">
                                                      {item.collection.name}
                                                    </div>
                                                    <div className="flex items-center gap-[0.3rem] text-[0.9rem] font-medium">
                                                      <span className="rounded-[6px] bg-[#00c85345] px-[0.3rem] py-[0.03rem] text-[#00c853]">
                                                        {item.items.length}
                                                      </span>
                                                      {item.items.filter(
                                                        (i: any) =>
                                                          i.status === "listed",
                                                      ).length != 0 && (
                                                        <span className="inline-flex items-center gap-[0.2rem] rounded-[6px] bg-[#1e90ff33] px-[0.3rem] py-[0.03rem] text-[#1e90ff]">
                                                          <Image
                                                            src="/assets/icons/arrow-tilt.svg"
                                                            width={16}
                                                            height={16}
                                                            alt="arrow-tilt"
                                                          />
                                                          {
                                                            item.items.filter(
                                                              (i: any) =>
                                                                i.status ===
                                                                "listed",
                                                            ).length
                                                          }
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  {collectionInfo.find(
                                                    (i: any) =>
                                                      i.symbol ===
                                                      item.collection.symbol,
                                                  )?.floorPrice != 0 && (
                                                    <div className="ml-auto text-right whitespace-nowrap">
                                                      <div className="flex">
                                                        <Image
                                                          src="/assets/coin.gif"
                                                          alt="coin"
                                                          width={18}
                                                          height={18}
                                                          priority
                                                          className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                                        />
                                                        {collectionInfo.find(
                                                          (i: any) =>
                                                            i.symbol ===
                                                            item.collection
                                                              .symbol,
                                                        )?.floorPrice *
                                                          item.items.length}
                                                      </div>
                                                    </div>
                                                  )}
                                                </Link>
                                              ),
                                            )}
                                          </>
                                        )}
                                      </>
                                    </>
                                  )}

                                  {myWalletPrc20.length != 0 && (
                                    <>
                                      <div className="my-1 flex items-center justify-between px-1 font-bold">
                                        <div>Prc-20</div>
                                        <div className="font-medium">
                                          <div className="flex">
                                            <Image
                                              src="/assets/coin.gif"
                                              alt="coin"
                                              width={18}
                                              height={18}
                                              priority
                                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                            />
                                            {totalPrcValue}
                                          </div>
                                        </div>
                                      </div>
                                      {myWalletPrc20.map(
                                        (item: any, index: number) => {
                                          // Calculate how many transfers are listed
                                          const listedCount = (
                                            item.transfers || []
                                          ).filter((transfer: any) => {
                                            const inscriptionId =
                                              transfer.outpoint.split(":")[0] +
                                              "i0";
                                            const status =
                                              prc20ListingStatuses.get(
                                                inscriptionId,
                                              );
                                            return status?.status === "listed";
                                          }).length;

                                          return (
                                            <Link
                                              key={index}
                                              href={`/wallet/${walletAddress}?tab=prc`}
                                              className="mb-2 flex cursor-pointer items-center justify-start gap-3 rounded-[18px] border border-transparent bg-[#0000004d] px-3 py-2 text-[1.1rem] leading-[1.2] transition-all duration-200 ease-in-out hover:bg-[#00000080]"
                                            >
                                              <Avatar text={item.tick} />
                                              <div className="min-w-0">
                                                <div className="mb-1 overflow-hidden text-[1.1rem] font-semibold text-ellipsis whitespace-nowrap text-white">
                                                  {item.tick}
                                                </div>
                                                <div className="flex items-center gap-[0.3rem] text-[0.9rem] font-medium">
                                                  <span className="rounded-[6px] bg-[#00c85345] px-[0.3rem] py-[0.03rem] text-[#00c853]">
                                                    {item.transfers_count}
                                                  </span>
                                                  {listedCount > 0 && (
                                                    <span className="inline-flex items-center gap-[0.2rem] rounded-[6px] bg-[#1e90ff33] px-[0.3rem] py-[0.03rem] text-[#1e90ff]">
                                                      <Image
                                                        src="/assets/icons/arrow-tilt.svg"
                                                        width={16}
                                                        height={16}
                                                        alt="arrow-tilt"
                                                      />
                                                      {listedCount}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              {prc20Info.find(
                                                (i: any) =>
                                                  i.tick === item.tick,
                                              ) && (
                                                <div className="ml-auto text-right whitespace-nowrap">
                                                  <div className="flex">
                                                    <Image
                                                      src="/assets/coin.gif"
                                                      alt="coin"
                                                      width={18}
                                                      height={18}
                                                      priority
                                                      className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                                    />
                                                    {prc20Info.find(
                                                      (i: any) =>
                                                        i.tick === item.tick,
                                                    )?.floorPrice *
                                                      (Number(item.balance) +
                                                        Number(
                                                          item.transferable_balance,
                                                        ))}
                                                  </div>
                                                </div>
                                              )}
                                            </Link>
                                          );
                                        },
                                      )}
                                    </>
                                  )}
                                </>
                              ) : (
                                <div className="text-center">nothing here</div>
                              )}
                            </>
                          )
                        )}
                      </TabsContent>
                      <TabsContent value="listings" className="flex flex-col">
                        {isLoading ? (
                          <Spinner className="m-auto size-6" />
                        ) : !hasListings ? (
                          <div className="text-center">
                            you have no active listings at the moment
                          </div>
                        ) : (
                          <>
                            {/* Pepemaps Listings */}
                            {listedPepemaps.length > 0 && (
                              <>
                                <div className="my-1 px-1 font-bold">
                                  Pepemaps ({listedPepemaps.length})
                                </div>
                                {listedPepemaps.map((item: any) => {
                                  const inscription = inscriptions.find(
                                    (i: any) =>
                                      i.inscription_id === item.inscriptionId,
                                  );
                                  return (
                                    <div
                                      key={item.inscriptionId}
                                      className="my-2 flex items-center leading-[1.2]"
                                    >
                                      {inscription && (
                                        <PepemapImage item={inscription} sm />
                                      )}
                                      <div className="ml-3">
                                        <div className="text-[1.1rem] font-semibold">
                                          {inscription?.content}
                                        </div>
                                        <div className="flex">
                                          <Image
                                            src="/assets/coin.gif"
                                            alt="coin"
                                            width={18}
                                            height={18}
                                            priority
                                            className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                          />
                                          <span className="mr-2">
                                            {item.listing?.priceSats}
                                          </span>
                                          <span className="text-[#fffc]">
                                            ($
                                            {(
                                              item.listing?.priceSats *
                                              pepecoinPrice
                                            ).toFixed(2)}
                                            )
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handlePepemapUnlist(
                                            item.inscriptionId,
                                          )
                                        }
                                        className="ml-auto cursor-pointer rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium transition-all duration-200 ease-in-out hover:bg-[#222]"
                                      >
                                        Unlist
                                      </button>
                                    </div>
                                  );
                                })}
                              </>
                            )}

                            {/* NFTs Listings */}
                            {listedNfts.length > 0 && (
                              <>
                                <div className="my-1 px-1 font-bold">
                                  NFTs ({listedNfts.length})
                                </div>
                                {listedNfts.map((item: any) => {
                                  const inscription = inscriptions.find(
                                    (i: any) =>
                                      i.inscription_id === item.inscriptionId,
                                  );
                                  return (
                                    <div
                                      key={item.inscriptionId}
                                      className="my-2 flex items-center leading-[1.2]"
                                    >
                                      {inscription && (
                                        <Image
                                          src={`${ORD_API_BASE}/content/${item.inscriptionId}`}
                                          alt={`Inscription #${item.inscriptionId}`}
                                          width={48}
                                          height={48}
                                          className="mr-3 h-12 w-12 shrink-0 grow-0 basis-12 rounded-lg object-cover [image-rendering:pixelated]"
                                          unoptimized
                                        />
                                      )}
                                      <div>
                                        <div className="text-[1.1rem] font-semibold">
                                          {item.listing?.inscription?.name}
                                        </div>
                                        <div className="flex">
                                          <Image
                                            src="/assets/coin.gif"
                                            alt="coin"
                                            width={18}
                                            height={18}
                                            priority
                                            className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                          />
                                          <span className="mr-2">
                                            {item.listing?.priceSats}
                                          </span>
                                          <span className="text-[#fffc]">
                                            ($
                                            {(
                                              item.listing?.priceSats *
                                              pepecoinPrice
                                            ).toFixed(2)}
                                            )
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handleNftUnlist(item.inscriptionId)
                                        }
                                        className="ml-auto cursor-pointer rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium transition-all duration-200 ease-in-out hover:bg-[#222]"
                                      >
                                        Unlist
                                      </button>
                                    </div>
                                  );
                                })}
                              </>
                            )}

                            {/* PRC-20 Listings */}
                            {listedPrc20s.length > 0 && (
                              <>
                                <div className="my-1 px-1 font-bold">
                                  PRC-20 ({listedPrc20s.length})
                                </div>
                                {listedPrc20s.map((item: any) => {
                                  // Find the token info from myWalletPrc20
                                  const tick = item.listing?.prc20Label;
                                  return (
                                    <div
                                      key={item.inscriptionId}
                                      className="my-2 flex items-center leading-[1.2]"
                                    >
                                      <div className="mr-3">
                                        <Avatar text={tick} />
                                      </div>
                                      <div>
                                        <div className="text-[1.1rem] font-semibold">
                                          <span>{tick}</span>
                                          <span className="text-[0.9rem] text-[#fffc]">
                                            {"(" + item.listing.amount + ")"}
                                          </span>
                                        </div>
                                        <div className="flex">
                                          <Image
                                            src="/assets/coin.gif"
                                            alt="coin"
                                            width={18}
                                            height={18}
                                            priority
                                            className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                                          />
                                          <span className="mr-2">
                                            {item.listing?.priceSats}
                                          </span>
                                          <span className="text-[#fffc]">
                                            ($
                                            {(
                                              item.listing?.priceSats *
                                              pepecoinPrice
                                            ).toFixed(2)}
                                            )
                                          </span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() =>
                                          handlePrcUnlist(item.inscriptionId)
                                        }
                                        className="ml-auto cursor-pointer rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium transition-all duration-200 ease-in-out hover:bg-[#222]"
                                      >
                                        Unlist
                                      </button>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                          </>
                        )}
                      </TabsContent>
                    </Tabs>
                  </>
                )}
                {walletState === "send" && (
                  <>
                    <div className="relative mb-4 flex justify-center">
                      <ChevronLeft
                        onClick={() => setWalletState("mywallet")}
                        className="absolute top-0 left-0 inline-block cursor-pointer overflow-hidden"
                      />
                      <div>Send</div>
                    </div>
                    <div className="mb-[0.1rem] rounded-[12px] rounded-b-none bg-[#00000026] px-4 py-3">
                      <div className="flex items-center gap-x-[0.75em]">
                        <Image
                          src="/assets/coin.gif"
                          alt="logo"
                          width={40}
                          height={40}
                          priority
                          className="m-0 h-10 w-10"
                        />
                        <div>
                          <div className="font-semibold">pepe</div>
                          <div className="flex text-[0.9rem]">
                            Balance:&#xA0;
                            <Image
                              src="/assets/coin.gif"
                              alt="logo"
                              width={16}
                              height={16}
                              priority
                              className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                            />
                            {balance?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[12px] rounded-t-none bg-[#00000026] px-4 py-3">
                      <div>
                        <div className="text-[0.9rem] font-semibold">
                          Amount
                        </div>
                        <div className="flex items-center gap-x-[0.5em]">
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "." ||
                                e.key === "e" ||
                                e.key === "-"
                              ) {
                                e.preventDefault();
                              }
                            }}
                            className="mr-0 w-full border-0 px-[0.6em] py-[0.3em] text-left outline-none"
                          />
                        </div>
                      </div>
                      <div className="mt-1 flex items-center">
                        {amount ? (
                          <div className="text-[0.9rem] text-white/90">
                            ${(Number(amount) * pepecoinPrice).toFixed(2)}
                          </div>
                        ) : (
                          ""
                        )}
                      </div>
                    </div>
                    <div className="mt-4 rounded-[12px] bg-[#00000026] px-4 py-3">
                      <div className="text-[0.9rem] font-semibold">To</div>
                      <input
                        type="text"
                        placeholder="Enter address"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        className="font-inherit mr-2 w-full border-0 bg-transparent px-[0.6em] py-[0.3em] text-left text-inherit outline-none"
                      />
                    </div>
                    <div className="mt-4 flex justify-between text-[0.9rem]">
                      <div>Network fee</div>
                      <div className="flex">
                        <Image
                          src="/assets/coin.gif"
                          alt="coin"
                          width={18}
                          height={18}
                          priority
                          className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                        />
                        0.01
                        <span className="text-[#fffc]">($0.00)</span>
                      </div>
                    </div>
                    <button
                      onClick={handleSend}
                      disabled={sending || sendButtonDisabled}
                      className="font-inherit mt-2.5 flex w-full justify-center rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-bold text-white transition-all duration-200 ease-in-out"
                    >
                      {sending ? (
                        <>
                          <Spinner className="size-6" />
                          <>&#xA0;Broadcasting transaction</>
                        </>
                      ) : (
                        sendButtonText
                      )}
                    </button>
                  </>
                )}
                {walletState === "lock" && (
                  <>
                    <div className="my-8 text-center text-[1.2rem]">
                      Enter your wallet password
                    </div>
                    <div className="my-2 flex rounded-md border border-white">
                      <input
                        id="password"
                        type={showLockPassword ? "text" : "password"}
                        value={lockPassword}
                        onChange={(e) => setLockPassword(e.target.value)}
                        className="font-inherit w-full border-none bg-transparent py-2.5 pl-[0.6em] text-inherit outline-none active:border"
                        placeholder="Enter password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLockPassword(!showLockPassword)}
                        className="inline-block cursor-pointer overflow-hidden bg-transparent p-[0.6em]"
                      >
                        {showLockPassword ? (
                          <Eye size={18} />
                        ) : (
                          <EyeOff size={18} />
                        )}
                      </button>
                    </div>
                    {lockError && (
                      <div className="text-[95%] text-[#ff4500]">
                        {lockError}
                      </div>
                    )}
                    <Button
                      onClick={handleUnlockPassword}
                      className="font-inherit mt-4 cursor-pointer rounded-xl border border-transparent bg-white px-4 py-5 text-[1em] font-medium text-black transition-all duration-200 ease-in-out"
                    >
                      Unlock
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
