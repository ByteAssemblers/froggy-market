"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { ChevronUp, ChevronDown, Link, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function InscribeHistory() {
  const [inscriptions, setInscriptions] = useState<any[]>([]);
  const { walletInfo, walletAddress } = useProfile();

  useEffect(() => {
    walletInfo();
  }, []);

  useEffect(() => {
    const fetchWallet = async () => {
      let page = 1;
      let allInscriptions: any = [];
      let continueFetching = true;

      while (continueFetching) {
        const response = await fetch(
          `http://localhost:7777/inscriptions/balance/${walletAddress}/${page}`,
        );
        const data = await response.json();
        if (data.inscriptions && data.inscriptions.length > 0) {
          // Add the new inscriptions to the list
          allInscriptions = [...allInscriptions, ...data.inscriptions];

          // Move to the next page
          page++;
        } else {
          // Stop if no more inscriptions are found
          continueFetching = false;
        }
      }

      // Sort inscriptions by timestamp in descending order
      allInscriptions.sort((a: any, b: any) => b.timestamp - a.timestamp);

      // Update the state with the sorted inscriptions
      setInscriptions(allInscriptions);
    };

    fetchWallet();
  }, [walletAddress]);

  return (
    <>
      <div className="mt-6 mb-4 flex items-center justify-between">
        <h3 className="m-0 mx-0 my-[1em] block text-[1.17em] font-bold">
          History
        </h3>
        <div className="inline-flex cursor-pointer items-center gap-2">
          <RefreshCw />
          <span>Refresh</span>
        </div>
      </div>
      <div>
        {inscriptions.map((item, index) => (
          <div key={index}>
            <div className="flex items-center gap-4">
              <div>{item.utxo.txid}</div>
              <div className="mr-auto text-[0.9rem]">
                {formatDistanceToNow(
                  new Date(item.timestamp * 1000).toLocaleString(),
                )}
              </div>
              <a
                href="#"
                className="cursor-pointer text-[0.9rem] font-medium text-[#c891ff] [text-decoration:inherit]"
              >
                copy metadata
              </a>
              <div className="text-right text-green-500">
                <div>inscribed</div>
                <div>1/1</div>
              </div>
              <ChevronUp />
            </div>
            <div className="flex gap-2 text-[0.9rem]">
              <div>{item.content_type}</div>
              <div>{item.content_length} bytes</div>
              <div className="ml-auto flex">
                <Link
                  href={`inscription/${item.inscription_id}`}
                  className="mr-4 cursor-pointer font-medium text-[#dfc0fd] [text-decoration:inherit]"
                >
                  {item.inscription_id}
                </Link>
                <span className="text-green-500">confirmed</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
