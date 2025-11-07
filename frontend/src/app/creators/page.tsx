"use client";

import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useProfile } from "@/hooks/useProfile";

export default function Creators() {
  const [creatorState, setCreatorState] = useState<
    "setup" | "dashboard" | "list"
  >("setup");
  const {
    walletInfo,
    isLocked,
    hasSavedWallet,
    walletAddress,
    collections,
    isCollectionsLoading,
    collectionsError,
  } = useProfile();

  const [collectionData, setCollectionData] = useState({
    name: "",
    symbol: "",
    description: "",
    profileInscriptionId: "",
    socialLink: "",
    personalLink: "",
    totalSupply: "",
    inscriptionsList: "",
  });

  const [collectionList, setCollectionList] = useState<any[]>([]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setCollectionData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    walletInfo();
  }, []);

  useEffect(() => {
    if (collections && !isCollectionsLoading) {
      const userCollections = collections.filter(
        (col: any) => col.walletAddress === walletAddress,
      );
      setCollectionList(userCollections);
    }
  }, [collections, isCollectionsLoading, walletAddress]);

  if (isCollectionsLoading) return <div>Loading...</div>;
  if (collectionsError) return <div>Error loading collections</div>;

  // if (!collectionList.length) return <div>No collections found</div>;

  const handleSubmit = async () => {
    if (
      !collectionData.name ||
      !collectionData.symbol ||
      !collectionData.description ||
      !collectionData.totalSupply ||
      !collectionData.profileInscriptionId ||
      !collectionData.socialLink
    ) {
      alert("Please fill out all required fields.");
      return;
    }

    if (collectionData.symbol.length < 4) {
      alert("Collection symbol must be at least 4 characters long.");
      return;
    }

    try {
      const inscriptions = JSON.parse(collectionData.inscriptionsList || "[]");
      if (!Array.isArray(inscriptions)) {
        throw new Error("Inscriptions list must be a valid JSON array.");
      }
    } catch (error) {
      alert("Inscriptions list must be a valid JSON array.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5555/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: collectionData.name,
          symbol: collectionData.symbol,
          description: collectionData.description,
          profileInscriptionId: collectionData.profileInscriptionId,
          socialLink: collectionData.socialLink,
          personalLink: collectionData.personalLink,
          totalSupply: Number(collectionData.totalSupply),
          inscriptions: JSON.parse(collectionData.inscriptionsList || "[]"),
          wallet: walletAddress,
        }),
      });

      if (!response.ok) throw new Error("Failed to create collection");
      alert("Collection created successfully!");
      setCreatorState("dashboard");
    } catch (err) {
      console.error(err);
      alert("Error creating collection");
    }
  };

  return (
    <>
      {hasSavedWallet && !isLocked ? (
        <>
          {creatorState == "setup" && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="flex justify-center">
                <button
                  onClick={() => setCreatorState("dashboard")}
                  className="font-inherit cursor-pointer rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium transition-all duration-200 ease-in-out hover:bg-[#222]"
                >
                  Enter dashboard
                </button>
              </div>
              <div className="mt-4 text-[0.9rem]">
                All collections will be assigned to your wallet{" "}
                {walletAddress.slice(0, 5)}...{walletAddress.slice(-5)}
              </div>
            </div>
          )}

          {creatorState == "dashboard" && (
            <>
              <div className="mb-8 flex gap-x-8">
                <button
                  onClick={() => setCreatorState("list")}
                  className="font-inherit cursor-pointer rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium transition-all duration-200 ease-in-out hover:bg-[#222]"
                >
                  List Collection
                </button>
              </div>
              <div className="flex flex-wrap gap-8">
                {collectionList.map((item: any, index: any) => (
                  <div
                    key={index}
                    className="flex w-40 flex-col overflow-hidden"
                  >
                    <Image
                      src={`http://localhost:7777/content/${item.profileInscriptionId}`}
                      alt={`Inscription #${item.profileInscriptionId}`}
                      width={160}
                      height={160}
                      unoptimized
                    />
                    <div className="text-[1.2rem] font-semibold">
                      {item.name}
                    </div>
                    <div className="text-[0.9rem]">pending-approval</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {creatorState == "list" && (
            <>
              <button
                onClick={() => setCreatorState("dashboard")}
                className="font-inherit inline-flex cursor-pointer items-center rounded-[12px] border border-transparent bg-[#1a1a1a] pt-1 pr-2 pb-1 pl-0 text-[1em] font-medium transition-all duration-200 ease-in-out"
              >
                <ChevronLeft />
                <span>Go back</span>
              </button>
              <h2 className="mx-0 my-[0.83em] block text-[1.5em] leading-[1.1] font-bold">
                List collection
              </h2>
              <div>
                <div className="mb-6">
                  <div className="mb-2">Collection name:</div>
                  <input
                    name="name"
                    type="text"
                    placeholder="My collection"
                    value={collectionData.name}
                    onChange={handleChange}
                    className="font-inherit mr-2 w-80 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
                  />
                </div>
                <div className="mb-6">
                  <div className="mb-2">
                    <div className="mb-1">Collection symbol:</div>
                    <div className="text-[0.9rem] text-[#ffffffe6]">
                      Minimum 4 characters, only lowercase letters a-z and "-"
                      allowed
                    </div>
                  </div>
                  <input
                    name="symbol"
                    type="text"
                    placeholder="my-collection"
                    value={collectionData.symbol}
                    onChange={handleChange}
                    className="font-inherit mr-2 w-80 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
                  />
                </div>
                <div className="mb-6">
                  <div className="mb-2">Collection description:</div>
                  <textarea
                    name="description"
                    value={collectionData.description}
                    onChange={handleChange}
                    className="text-fieldtext bg-field overflow-wrap break-word inline-block h-28 w-80 max-w-full cursor-text resize-none border border-gray-400 bg-[#3b3b3b] p-0.5 text-start font-mono text-[0.75rem] leading-normal tracking-normal whitespace-pre-wrap"
                  />
                </div>
                <div className="mb-6">
                  <div className="mb-2">Collection profile inscription id:</div>
                  <input
                    name="profileInscriptionId"
                    type="text"
                    placeholder="15f3b73df7e5c072becb1d84191843ba080734805addfccb650929719080f62ei0"
                    value={collectionData.profileInscriptionId}
                    onChange={handleChange}
                    className="font-inherit mr-2 w-80 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
                  />
                </div>
                <div className="mb-6">
                  <div className="mb-2">X (twitter) link:</div>
                  <input
                    name="socialLink"
                    type="text"
                    placeholder="https://x.com/mycollection"
                    value={collectionData.socialLink}
                    onChange={handleChange}
                    className="font-inherit mr-2 w-80 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
                  />
                </div>
                <div className="mb-6">
                  <div className="mb-2">Website url (optional):</div>
                  <input
                    name="personalLink"
                    type="text"
                    placeholder="https://mycollection.com"
                    value={collectionData.personalLink}
                    onChange={handleChange}
                    className="font-inherit mr-2 w-80 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
                  />
                </div>
                <div className="mb-6">
                  <div className="mb-2">Collection total supply:</div>
                  <input
                    name="totalSupply"
                    type="number"
                    placeholder="10000"
                    value={collectionData.totalSupply}
                    onChange={handleChange}
                    className="font-inherit mr-2 w-80 max-w-full border-b border-[tan] bg-transparent p-1.5 text-center text-inherit outline-none focus:border-[violet]"
                  />
                </div>
                <div className="mb-6">
                  <div className="mb-2">
                    Inscriptions list (
                    <a
                      href="/collection-example.txt"
                      target="_blank"
                      className="text-[#c891ff]"
                    >
                      example
                    </a>
                    )
                  </div>
                  <textarea
                    name="inscriptionsList"
                    value={collectionData.inscriptionsList}
                    onChange={handleChange}
                    className="text-fieldtext bg-field overflow-wrap break-word inline-block h-28 w-80 max-w-full cursor-text resize-none border border-gray-400 bg-[#3b3b3b] p-0.5 text-start font-mono text-[0.75rem] leading-normal tracking-normal whitespace-pre-wrap"
                  />
                  <div className="flex">
                    <button className="font-inherit cursor-pointer rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium transition-all duration-200 ease-in-out">
                      Add
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    onClick={handleSubmit}
                    className="font-inherit cursor-pointer rounded-[12px] border border-transparent bg-[#1a1a1a] px-4 py-2 text-[1em] font-medium transition-all duration-200 ease-in-out"
                  >
                    Submit collection
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          Set up your wallet to enter creators dashboard
        </div>
      )}
    </>
  );
}
