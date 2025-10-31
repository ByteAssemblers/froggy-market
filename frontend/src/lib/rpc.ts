import 'server-only';

const RPC_URL = process.env.PEPECOIN_RPC_URL!;
const RPC_USER = process.env.PEPECOIN_RPC_USER!;
const RPC_PASSWORD = process.env.PEPECOIN_RPC_PASSWORD!;

let id = 0;

export async function rpc<T = any>(method: string, params: any[] = []): Promise<T> {
  if (!RPC_URL || !RPC_USER || !RPC_PASSWORD) {
    throw new Error('Missing RPC credentials in environment');
  }

  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(`${RPC_USER}:${RPC_PASSWORD}`).toString('base64'),
    },
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: id++,
      method,
      params,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC HTTP ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.error) throw new Error(`RPC Error: ${JSON.stringify(json.error)}`);

  return json.result as T;
}
