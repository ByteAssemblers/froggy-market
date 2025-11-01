import { forwardBelIndexerJson } from "../utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return forwardBelIndexerJson(
    "/tokens",
    { params: Object.fromEntries(searchParams) },
    "bel indexer tokens fetch failed",
  );
}
