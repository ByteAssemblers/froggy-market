"use client";
import { use, useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EllipsisVertical, Filter } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import pepeOrdSwap from "@/lib/OrdSwap";

export default function WalletAddress({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const [inscriptions, setInscriptions] = useState<any[]>([]);

  const { walletInfo, walletAddress, privateKey, pepecoinPrice } = useProfile();

  useEffect(() => {
    walletInfo();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await fetch(
        `http://localhost:5555/api/listings/wallet/${address}`,
      );
      const data = await response.json();

      // Check if data is an array before setting
      if (Array.isArray(data)) {
        setInscriptions(data);
      } else {
        console.error('Invalid response format:', data);
        setInscriptions([]);
      }
    } catch (error) {
      console.error('Error fetching wallet NFTs:', error);
      setInscriptions([]);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [address]);

  const handleUnlist = async (item: any) => {
    try {
      const response = await fetch("http://localhost:5555/api/listings/unlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inscriptionId: item.inscription_id,
          sellerAddress: walletAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to unlist NFT");
      }

      alert("✅ NFT unlisted successfully!");
      // Refresh the wallet data
      fetchWallet();
    } catch (error: any) {
      console.error(error);
      alert(`❌ ${error.message}`);
    }
  };

  function ListDialogContent({ item }: { item: any }) {
    const [price, setPrice] = useState<Number>(0);

    const [isListing, setIsListing] = useState(false);
    const [message, setMessage] = useState("");

    async function handleList() {
      try {
        if (!price || Number(price) <= 0) {
          alert("Please enter a valid price");
          return;
        }

        if (!privateKey) {
          alert("Wallet not unlocked");
          return;
        }

        setIsListing(true);

        // fetch full transaction data for this NFT
        const txid = item.genesis_tx || item.inscription_id.split("i")[0]; // adapt if needed
        const vout = Number(item.vout || 0);

        const res = await fetch("http://localhost:5555/api/listings/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerWif: privateKey,
            nftTxid: txid,
            nftVout: vout,
            priceSats: price,
            sellerAddress: walletAddress,
            inscriptionId: item.inscription_id,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to list NFT");
        }

        alert(`✅ NFT listed for sale!\nListing ID: ${data.id}`);

        // Refresh the wallet data to update button state
        await fetchWallet();
      } catch (error: any) {
        console.error(error);
        alert(`❌ ${error.message}`);
      } finally {
        setIsListing(false);
      }
    }

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <Image
              src={`http://localhost:7777/content/${item.inscription_id}`}
              alt={`Inscription #${item.inscription_id}`}
              width={144}
              height={144}
              className="mx-auto h-36 w-36 rounded-md text-[0.8rem]"
              unoptimized
            />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                #{item.inscription_number}
              </div>
            </div>
          </div>
        </div>
        <div className="my-4 flex w-full items-center justify-center">
          <div className="mr-8 ml-14 pt-4 font-semibold">Price:</div>
          <Image
            src="/assets/coin.gif"
            alt="coin"
            width={18}
            height={18}
            priority
            className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
          />
          <input
            type="number"
            value={Number(price)}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="font-inherit mr-2 w-20 max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
          />
        </div>
        <div className="mt-2 flex justify-center leading-8">
          <div className="mr-8 w-1/2 text-right">Maker fee (1.4%):</div>
          <div className="flex w-1/2 text-left">
            {price !== 0 && (
              <>
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />
                <span>{Number(price) * 0.014}</span>
                <span className="text-[#fffc]">
                  ($
                  {(Number(price) * 0.014 * pepecoinPrice).toFixed(2)})
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex justify-center leading-8">
          <div className="mr-8 w-1/2 text-right">You will receive:</div>
          <div className="flex w-1/2 text-left">
            {price !== 0 && (
              <>
                <Image
                  src="/assets/coin.gif"
                  alt="coin"
                  width={18}
                  height={18}
                  priority
                  className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                />

                <span>{Number(price) * 0.986}</span>
                <span className="text-[#fffc]">
                  ($
                  {(Number(price) * 0.986 * pepecoinPrice).toFixed(2)})
                </span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={handleList}
          disabled={isListing || Number(price) <= 0}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            isListing || Number(price) <= 0
              ? "bg-[#1a1a1a]"
              : "bg-[#007aff] hover:bg-[#3b82f6]"
          }`}
        >
          {isListing ? "Listing..." : "Confirm Listing"}
        </button>

        {message && (
          <div className="mt-3 text-center text-sm break-all text-[#dfc0fd]">
            {message}
          </div>
        )}
      </>
    );
  }
  function SendDialogContent({
    item,
    walletAddress,
  }: {
    item: any;
    walletAddress: string;
  }) {
    const [toAddress, setToAddress] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");

    const validateAddress = (address: string) =>
      /^[P][a-zA-Z0-9]{25,34}$/.test(address);

    useEffect(() => {
      setIsValid(validateAddress(toAddress));
    }, [toAddress]);

    async function handleSend() {
      try {
        setIsLoading(true);
        setMessage("");

        const res = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromAddress: walletAddress,
            toAddress,
            inscriptionId: item.inscription_id,
            privateKey: privateKey,
            fee: 0.00015,
          }),
        });

        const data = await res.json();
        setIsLoading(false);
        setMessage(
          data.txid ? `✅ Sent! TXID: ${data.txid}` : `❌ ${data.error}`,
        );
      } catch (e: any) {
        setIsLoading(false);
        setMessage(`Error: ${e.message}`);
      }
    }

    return (
      <>
        <div className="mb-2 flex max-h-104 flex-wrap justify-center gap-2.5 overflow-y-auto">
          <div className="rounded-[12px] bg-[#00000080] p-2">
            <Image
              src={`http://localhost:7777/content/${item.inscription_id}`}
              alt={`Inscription #${item.inscription_id}`}
              width={144}
              height={144}
              className="mx-auto h-36 w-36 rounded-md text-[0.8rem]"
              unoptimized
            />
            <div className="mt-2 text-center text-[1rem] text-white">
              <div className="text-center text-[0.8rem] text-[#dfc0fd]">
                #{item.inscription_number}
              </div>
            </div>
          </div>
        </div>
        <div className="my-4 flex w-full items-center justify-center">
          <div className="mr-4 text-[1.1rem] font-semibold">Send to:</div>
          <input
            className="font-inherit mr-2 w-full max-w-md border-b border-[tan] bg-transparent p-[0.4em] text-center text-inherit outline-none focus:border-[violet]"
            placeholder="Enter Pepecoin address"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value.trim())}
          />
        </div>

        <div className="mt-12 flex justify-center text-[0.9rem] leading-8">
          <div className="mr-8 w-1/2 text-right">Network fee:</div>
          <div className="flex w-1/2 text-left">
            <Image
              src="/assets/coin.gif"
              alt="coin"
              width={18}
              height={18}
              priority
              className="mt-2 mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
            />
            <span>~0.00015</span>
            <span className="text-[#fffc]"> ($0.02)</span>
          </div>
        </div>

        <button
          disabled={!isValid || isLoading}
          onClick={handleSend}
          className={`font-inherit mt-4 flex w-full justify-center rounded-xl border border-transparent px-4 py-2 text-base font-bold transition-all duration-200 ease-in-out ${
            !isValid ? "bg-[#1a1a1a]" : "bg-[#007aff]"
          }`}
        >
          {isLoading
            ? "Creating transfer"
            : isValid
              ? "Confirm"
              : "Enter valid address"}
        </button>

        {message && (
          <div className="mt-3 text-center text-sm break-all text-[#dfc0fd]">
            {message}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <h1 className="leading-[1.1 ] text-3xl">
        {walletAddress === address ? "My wallet" : address}
      </h1>
      <Tabs defaultValue="nfts" className="relative">
        <TabsList className="my-4 flex shrink-0 flex-wrap items-center justify-between bg-transparent">
          <div className="my-2 flex list-none gap-5 overflow-x-auto p-0 select-none">
            <TabsTrigger value="prc" className="text-md">
              PRC-20
            </TabsTrigger>
            <TabsTrigger value="nfts" className="text-md">
              NFTs
            </TabsTrigger>
            <TabsTrigger value="pepemaps" className="text-md">
              Pepemaps
            </TabsTrigger>
            <TabsTrigger value="history" className="text-md">
              History
            </TabsTrigger>
            <TabsContent
              value="nfts"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
            <TabsContent
              value="pepemaps"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <Filter />
              </button>
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
            <TabsContent
              value="history"
              className="absolute right-0 flex items-center text-white"
            >
              <button className="rounded-xl bg-none p-1.5 leading-0">
                <EllipsisVertical />
              </button>
            </TabsContent>
          </div>
        </TabsList>
        <TabsContent value="prc">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead></TableHead>
                <TableHead>Tick</TableHead>
                <TableHead>Total balance</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Inscribed</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              {[...Array(20)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="w-auto px-0 text-center">
                    <Link href="/dxcn">
                      <div className="m-auto flex h-[42px] w-[42px] items-center justify-center rounded-full bg-[#212121] object-cover align-middle text-[0.7rem] select-none">
                        dxcn
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href="/dxcn">dxcn</Link>
                  </TableCell>
                  <TableCell>1,507,100,000,000</TableCell>
                  <TableCell>1,507,100,000,000</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell>
                    <div className="flex">
                      <Image
                        src="/assets/coin.gif"
                        alt="coin"
                        width={18}
                        height={18}
                        priority
                        className="mr-[0.4em] mb-[-0.2em] h-[1.1em] w-[1.1em]"
                      />
                      587.77
                    </div>
                    <div className="ml-5 text-[90%] leading-none font-medium text-[#fffc]">
                      $119.90
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <h2 className="mt-16 mb-5 text-2xl leading-[1.1]">Activity</h2>
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>Inscription</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Tick</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              {[...Array(20)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Link
                      href="/inscription/a93204a8caa7ba24ab3425974277fb39953773101ef0c22e47b8bb15081d777ei0"
                      className="cursor-pointer font-medium text-[#dfc0fd] decoration-inherit"
                    >
                      a93...ei0
                    </Link>
                  </TableCell>
                  <TableCell>receive</TableCell>
                  <TableCell>damm</TableCell>
                  <TableCell>1000</TableCell>
                  <TableCell>
                    <Link
                      href="wallet/DNKjZ3Tt3bwrVPFkvF43T8WcncXjDoXKVY"
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      DNKjZ...oXKVY
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      href="wallet/DRjY9RJfhQGLxmwa4EVh66az2KuXyzh1tB"
                      className="cursor-pointer font-medium text-[#c891ff] decoration-inherit"
                    >
                      DRjY9...zh1tB
                    </Link>
                  </TableCell>
                  <TableCell>
                    15.12.2023
                    <br />
                    23:24:54
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="nfts">
          <div className="relative flex">
            <div className="relative grow overflow-hidden">
              <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-5">
                {inscriptions.map((item, index) => (
                  <div
                    key={index}
                    className="relative flex flex-col items-center overflow-hidden rounded-xl border-2 border-transparent bg-[#4c505c33] p-4 text-center transition-all duration-150 ease-in-out"
                  >
                    <div className="flex h-32 w-32 items-center justify-center">
                      <Link
                        href={`/inscription/${item.inscription_id}`}
                        className="h-full w-full"
                      >
                        <Image
                          src={`http://localhost:7777/content/${item.inscription_id}`}
                          alt="nft"
                          width={128}
                          height={128}
                          className="pointer-events-none h-full max-h-32 w-auto max-w-32 rounded-xl bg-[#444] object-contain text-[0.8rem] select-none"
                          unoptimized
                        />
                      </Link>
                    </div>
                    <div className="my-1.5 flex w-full justify-center text-[1.1rem] leading-[1.2]">
                      <span></span>
                      <span className="ml-4"></span>
                    </div>
                    <div className="mt-auto w-full border-t border-white/10 py-2">
                      <div className="text-[0.9rem] text-[#dfc0fd] hover:text-[#c891ff]">
                        <Link href={`/inscription/${item.inscription_id}`}>
                          #{item.inscription_number}
                        </Link>
                      </div>
                    </div>
                    {walletAddress === address && (
                      <div className="flex w-full gap-2.5">
                        {/* Show List button if not listed, Unlist button if listed */}
                        {item.dbMetadata?.listings?.[0]?.status !== 'listed' ? (
                          <Dialog>
                            <DialogTrigger className="font-inherit inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-[#263340] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out">
                              <svg
                                data-v-51cc9e0e=""
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                width="20"
                                height="20"
                              >
                                <path
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M3 11.172V5a2 2 0 0 1 2-2h6.172a2 2 0 0 1 1.414.586l8 8a2 2 0 0 1 0 2.828l-6.172 6.172a2 2 0 0 1-2.828 0l-8-8A2 2 0 0 1 3 11.172zM7 7h.001"
                                ></path>
                              </svg>
                              <span className="ml-2">List</span>
                            </DialogTrigger>
                            <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                              <DialogHeader>
                                <DialogTitle>
                                  <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#8fc5ff]">
                                    List NFT for sale
                                  </div>
                                </DialogTitle>
                                <DialogDescription></DialogDescription>

                                <ListDialogContent item={item} />
                              </DialogHeader>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <button
                            onClick={() => handleUnlist(item)}
                            className="font-inherit inline-flex w-full items-center justify-center rounded-xl border border-transparent bg-[#ff4444] px-4 py-2 text-base font-bold text-white transition-all duration-200 ease-in-out hover:bg-[#ff6666]"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              width="20"
                              height="20"
                            >
                              <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              ></path>
                            </svg>
                            <span className="ml-2">Unlist</span>
                          </button>
                        )}
                        <Dialog>
                          <DialogTrigger className="font-inherit inline-flex grow-0 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-[#3c1295] px-4 py-2 text-base font-bold text-[#d94fff] transition-all duration-200 ease-in-out hover:bg-[#9d12c8] hover:text-white">
                            <svg
                              data-v-51cc9e0e=""
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              width="20"
                              height="20"
                            >
                              <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="m6 12-3 9 18-9L3 3l3 9zm0 0h6"
                              ></path>
                            </svg>
                          </DialogTrigger>
                          <DialogContent className="my-[50px] box-border flex min-h-[500px] max-w-[calc(100%-1rem)] min-w-[700px] shrink-0 grow-0 scale-100 flex-col overflow-visible rounded-[12px] bg-[#ffffff1f] p-6 opacity-100 backdrop-blur-xl transition-opacity duration-200 ease-linear">
                            <DialogHeader>
                              <DialogTitle>
                                <div className="mt-0 text-center text-3xl leading-[1.1] font-semibold text-[#d94fff]">
                                  Send NFT
                                </div>
                              </DialogTitle>
                              <DialogDescription></DialogDescription>
                              <SendDialogContent
                                item={item}
                                walletAddress={walletAddress}
                              />
                            </DialogHeader>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="pepemaps">
          <div className="flex justify-center">no pepemaps on this wallet</div>
        </TabsContent>
        <TabsContent value="history">
          <Table className="w-full max-w-full border-separate border-spacing-0 leading-[1.2]">
            <TableHeader className="text-left text-[0.95rem] font-normal text-[#8a939b]">
              <TableRow className="">
                <TableHead>Item</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-[16px]">
              <TableRow>
                <TableCell>nothing to show</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </>
  );
}
