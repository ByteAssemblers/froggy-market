import { rpc } from '@/lib/rpc';

export async function GET() {
  const info = await rpc('getblockchaininfo');
  return Response.json(info);
}