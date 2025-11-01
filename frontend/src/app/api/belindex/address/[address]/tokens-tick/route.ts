import { forwardBelIndexerJson } from "../../../utils";

export async function GET(
  request: Request,
  { params }: { params: { address: string } },
) {
  const { searchParams } = new URL(request.url);
  const address = encodeURIComponent(params.address);
  return forwardBelIndexerJson(
    `/address/${address}/tokens-tick`,
    { params: Object.fromEntries(searchParams) },
    "bel indexer address token ticks fetch failed",
  );
}
