import { forwardBelIndexerJson } from "../utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return forwardBelIndexerJson(
    "/holders-stats",
    { params: Object.fromEntries(searchParams) },
    "bel indexer holder stats fetch failed",
  );
}
