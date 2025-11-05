"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Inscription({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { id } = await params;
      try {
        const response = await fetch(
          `http://localhost:7777/inscription/${id}`,
        );
        if (response.status === 200) {
          const html = await response.text();
          setData(html);
          setLoading(false);
        } else if (response.status === 400) {
          setError(true);
          setLoading(false);
          router.push("/");
        } else {
          setError(true);
          setLoading(false);
        }
      } catch (err) {
        setError(true);
        setLoading(false);
      }
    };

    fetchData();
  }, [params, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Item not found or an error occurred.</div>;
  }

  // console.log(data);

  function extractInscriptionIdNumber(htmlString: string): string | null {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    const h1Element = doc.querySelector("h1");
    if (h1Element) {
      const text = h1Element.textContent?.trim();
      const match = text?.match(/\d+/); // Extracts the first sequence of digits
      return match ? match[0] : null;
    }
    return null;
  }
  // console.log(extractInscriptionIdNumber(data));

  function extractIdFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Extract the 'id' from the HTML content
    const id = doc.querySelector("dd.monospace")?.textContent;

    return id || null;
  }
  // console.log(extractIdFromHtml(data));

  function extractAddressFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "address" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "address") {
        // Get the next sibling <dd> element with class "monospace"
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd && dd.classList.contains("monospace")) {
          return dd.textContent?.trim() || null;
        }
      }
    }
    return null;
  }

  // console.log(extractAddressFromHtml(data));

  function extractOutputValueFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "output value" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "output value") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd) {
          return dd.textContent?.trim() || null;
        }
      }
    }
    return null;
  }

  // console.log(extractOutputValueFromHtml(data));

  function extractContentLengthFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "content length" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "content length") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd) {
          return dd.textContent?.trim() || null;
        }
      }
    }
    return null;
  }

  // console.log(extractContentLengthFromHtml(data));

  function extractContentTypeFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "content type" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "content type") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd) {
          return dd.textContent?.trim() || null;
        }
      }
    }
    return null;
  }

  // console.log(extractContentTypeFromHtml(data));

  function extractTimestampFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "timestamp" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "timestamp") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd) {
          // Find the <time> element within <dd>
          const time = dd.querySelector("time");
          if (time) {
            return time.textContent?.trim() || null;
          }
        }
      }
    }
    return null;
  }

  // console.log(extractTimestampFromHtml(data));

  function extractGenesisHeightFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "genesis height" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "genesis height") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd) {
          // Find the <a> tag inside <dd>
          const aTag = dd.querySelector("a");
          if (aTag) {
            return aTag.textContent?.trim() || null;
          }
        }
      }
    }
    return null;
  }

  // console.log(extractGenesisHeightFromHtml(data));

  function extractGenesisFeeFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "genesis fee" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "genesis fee") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd) {
          return dd.textContent?.trim() || null;
        }
      }
    }
    return null;
  }

  // console.log(extractGenesisFeeFromHtml(data));

  function extractGenesisTransactionFromHtml(
    htmlString: string,
  ): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "genesis transaction" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "genesis transaction") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd) {
          // Find the <a> tag with class 'monospace' inside <dd>
          const aTag = dd.querySelector("a.monospace");
          if (aTag) {
            return aTag.textContent?.trim() || null;
          }
        }
      }
    }
    return null;
  }

  // console.log(extractGenesisTransactionFromHtml(data));

  function extractLocationFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "location" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "location") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd && dd.classList.contains("monospace")) {
          return dd.textContent?.trim() || null;
        }
      }
    }
    return null;
  }

  // console.log(extractLocationFromHtml(data));

  function extractOffsetFromHtml(htmlString: string): string | null {
    // Create a DOMParser instance to parse the HTML string
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");

    // Find all <dt> elements and search for the "offset" one
    const dtElements = doc.querySelectorAll("dt");
    for (let dt of dtElements) {
      if (dt.textContent?.trim() === "offset") {
        // Get the next sibling <dd> element
        const dd = dt.nextElementSibling as HTMLElement;
        if (dd) {
          return dd.textContent?.trim() || null;
        }
      }
    }
    return null;
  }

  // console.log(extractOffsetFromHtml(data));

  return (
    <div className="mt-4 flex flex-wrap items-start gap-x-16 gap-y-4">
      <div className="flex aspect-square w-0 max-w-full shrink-0 grow basis-md justify-center">
        <Image
          src={`http://localhost:7777/content/${extractIdFromHtml(data)}`}
          alt={`Inscription #${extractInscriptionIdNumber(data)}`}
          width={512}
          height={512}
          className="h-full w-full object-contain"
          unoptimized
        />
      </div>
      <div className="flex w-0 max-w-full shrink-0 grow basis-md flex-col">
        <div className="mb-8 flex">
          <div>
            <div className="text-2xl text-[1.5rem] font-bold text-white">
              Inscription #{extractInscriptionIdNumber(data)}
            </div>
            <div className="leading-[1.2]">
              {/* <span className="text-white/75">#{extractInscriptionIdNumber(data)}</span>
              <Link href={"/nfts/minipepes"} className="ml-4 text-[#c891ff]">
                Pepinal Mini Pepes
              </Link> */}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-y-0.5 overflow-hidden rounded-[12px]">
          <div
            className="bg-[#1e1e1e] px-6 py-3"
            style={{
              backgroundColor: "#ffffff10",
            }}
          >
            <div className="mb-[0.2rem] text-sm">Inscription ID</div>
            <div className="text-[0.95em] leading-[1.2] font-bold break-words text-white">
              {extractIdFromHtml(data)}
            </div>
          </div>
          <div
            className="bg-[#1e1e1e] px-6 py-3"
            style={{
              backgroundColor: "#ffffff10",
            }}
          >
            <div className="mb-[0.2rem] text-sm">Owner</div>
            <Link
              href={`/wallet/${extractAddressFromHtml(data)}`}
              className="text-[0.95em] leading-[1.2] font-bold break-words text-[#c891ff]"
            >
              {extractAddressFromHtml(data)}
            </Link>
          </div>
          <div
            className="bg-[#1e1e1e] px-6 py-3"
            style={{
              backgroundColor: "#ffffff10",
            }}
          >
            <div className="mb-[0.2rem] text-sm">Created</div>
            <div className="text-[0.95em] leading-[1.2] font-bold break-words text-white">
              {extractTimestampFromHtml(data)}
            </div>
          </div>
          <div
            className="bg-[#1e1e1e] px-6 py-3"
            style={{
              backgroundColor: "#ffffff10",
            }}
          >
            <div className="mb-[0.2rem] text-sm">Content type</div>
            <div className="text-[0.95em] leading-[1.2] font-bold break-words text-white">
              {extractContentTypeFromHtml(data)}
            </div>
          </div>
          <div
            className="bg-[#1e1e1e] px-6 py-3"
            style={{
              backgroundColor: "#ffffff10",
            }}
          >
            <div className="mb-[0.2rem] text-sm">Content length</div>
            <div className="text-[0.95em] leading-[1.2] font-bold break-words text-white">
              {extractContentLengthFromHtml(data)}
            </div>
          </div>
          <div
            className="bg-[#1e1e1e] px-6 py-3"
            style={{
              backgroundColor: "#ffffff10",
            }}
          >
            <div className="mb-[0.2rem] text-sm">Output value</div>
            <div className="text-[0.95em] leading-[1.2] font-bold break-words text-white">
              {extractOutputValueFromHtml(data)}
            </div>
          </div>
          <div
            className="bg-[#1e1e1e] px-6 py-3"
            style={{
              backgroundColor: "#ffffff10",
            }}
          >
            <div className="mb-[0.2rem] text-sm">Location</div>
            <div className="text-[0.95em] leading-[1.2] font-bold break-words text-white">
              {extractLocationFromHtml(data)}
            </div>
          </div>
        </div>
        {/* <div className="mt-8">
          <div className="mb-2 text-[1.2rem] font-bold">Traits</div>
          <div className="flex flex-wrap gap-2.5">
            <div
              className="min-w-28 rounded-[12px] bg-[#ffffff0d] px-3 py-2 leading-[1.2]"
              style={{
                backgroundColor: "#ffffff10",
              }}
            >
              <div className="text-[0.8rem] text-[#fffc]">Background</div>
              <div>Red</div>
            </div>
            <div
              className="min-w-28 rounded-[12px] bg-[#ffffff0d] px-3 py-2 leading-[1.2]"
              style={{
                backgroundColor: "#ffffff10",
              }}
            >
              <div className="text-[0.8rem] text-[#fffc]">Fur</div>
              <div>Cream</div>
            </div>
            <div
              className="min-w-28 rounded-[12px] bg-[#ffffff0d] px-3 py-2 leading-[1.2]"
              style={{
                backgroundColor: "#ffffff10",
              }}
            >
              <div className="text-[0.8rem] text-[#fffc]">Body accessory</div>
              <div>Black collar</div>
            </div>
            <div
              className="min-w-28 rounded-[12px] bg-[#ffffff0d] px-3 py-2 leading-[1.2]"
              style={{
                backgroundColor: "#ffffff10",
              }}
            >
              <div className="text-[0.8rem] text-[#fffc]">Mouth</div>
              <div>Smiling</div>
            </div>
            <div
              className="min-w-28 rounded-[12px] bg-[#ffffff0d] px-3 py-2 leading-[1.2]"
              style={{
                backgroundColor: "#ffffff10",
              }}
            >
              <div className="text-[0.8rem] text-[#fffc]">Eyes</div>
              <div>Pepe eyes</div>
            </div>
            <div
              className="min-w-28 rounded-[12px] bg-[#ffffff0d] px-3 py-2 leading-[1.2]"
              style={{
                backgroundColor: "#ffffff10",
              }}
            >
              <div className="text-[0.8rem] text-[#fffc]">Head</div>
              <div>Baseball cap black</div>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
}
