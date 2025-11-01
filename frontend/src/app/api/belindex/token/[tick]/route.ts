import { forwardBelIndexerJson } from "../../utils";

export async function GET(
  request: Request,
  { params }: { params: { tick: string } },
) {
  const { searchParams } = new URL(request.url);
  const tick = encodeURIComponent(params.tick);
  return forwardBelIndexerJson(
    "/token",
    { params: { ...Object.fromEntries(searchParams), tick } },
    "bel indexer token fetch failed",
  );
}
