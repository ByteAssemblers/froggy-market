import { forwardBelIndexerJson } from "../utils";

export async function GET() {
  return forwardBelIndexerJson("/status", {}, "bel indexer status failed");
}
