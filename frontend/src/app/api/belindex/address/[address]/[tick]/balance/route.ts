import { forwardBelIndexerJson } from "../../../../utils";

export async function GET(
  request: Request,
  { params }: { params: { address: string; tick: string } },
) {
  const { searchParams } = new URL(request.url);
  const address = encodeURIComponent(params.address);
  const tick = encodeURIComponent(params.tick);
  return forwardBelIndexerJson(
    `/address/${address}/${tick}/balance`,
    { params: Object.fromEntries(searchParams) },
    "bel indexer address token balance fetch failed",
  );
}
