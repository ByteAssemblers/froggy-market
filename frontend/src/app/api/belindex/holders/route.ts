import { forwardBelIndexerJson } from "../utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return forwardBelIndexerJson(
    "/holders",
    { params: Object.fromEntries(searchParams) },
    "bel indexer holders fetch failed",
  );
}
