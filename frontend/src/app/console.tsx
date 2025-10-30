// 'use client';

// import { useEffect, useState } from 'react';
// import { belIndexerApi } from '@/lib/api/belIndexer';

// export default function AddressHistory({ address }: { address: string }) {
//   const [history, setHistory] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!address) return;

//     belIndexerApi
//       .getAddressHistory(address, { page: 1, limit: 20 }) // optional pagination
//       .then((res) => {
//         setHistory(res?.history || res);
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error(err);
//         setError(err.message);
//         setLoading(false);
//       });
//   }, [address]);

//   if (loading) return <p>Loading transaction history...</p>;
//   if (error) return <p>Error: {error}</p>;

//   return (
//     <div>
//       <h2>Transaction History</h2>
//       {history.length === 0 ? (
//         <p>No transactions found.</p>
//       ) : (
//         <ul className="space-y-2">
//           {history.map((tx, i) => (
//             <li key={i} className="border p-2 rounded">
//               <p><strong>TX ID:</strong> {tx.txid}</p>
//               <p><strong>Type:</strong> {tx.type}</p>
//               <p><strong>Amount:</strong> {tx.amount}</p>
//               <p><strong>Date:</strong> {new Date(tx.timestamp * 1000).toLocaleString()}</p>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }


// export default function AddressBalance({ params }: { params: { address: string } }) {
//   const [balance, setBalance] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);

//   const address = params.address;
//   const tick = 'PEPE'; // 👈 or dynamic tick symbol

//   useEffect(() => {
//     async function loadBalance() {
//       try {
//         const data = await belIndexerApi.getAddressTokenBalance(address, tick);
//         setBalance(data);
//       } catch (err: any) {
//         console.error(err);
//         setError(err.message);
//       }
//     }
//     loadBalance();
//   }, [address, tick]);

//   if (error) return <p className="text-red-500">Error: {error}</p>;
//   if (!balance) return <p>Loading balance...</p>;

//   return (
//     <div>
//       <h1>Balance for {address}</h1>
//       <pre>{JSON.stringify(balance, null, 2)}</pre>
//     </div>
//   );
// }

// export default function AddressTokensPage() {
//   const [tokens, setTokens] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   // Replace with the wallet address you want to query
//   const walletAddress = 'PnUZ56h4F84dBdCgZeUyouo4DgFiSBJCvQ';

//   useEffect(() => {
//     async function fetchTokens() {
//       try {
//         const data = await belIndexerApi.getAddressTokens(walletAddress, {
//           limit: 20,
//           page: 1,
//         });
//         setTokens(data.tokens);
//       } catch (err: any) {
//         console.error(err);
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchTokens();
//   }, [walletAddress]);

//   if (loading) return <p>Loading tokens...</p>;
//   if (error) return <p className="text-red-500">Error: {error}</p>;

//   return (
//     <div className="p-4">
//       <h1 className="text-xl font-bold mb-4">Tokens for {walletAddress}</h1>
//       {tokens.length === 0 ? (
//         <p>No tokens found.</p>
//       ) : (
//         <ul className="space-y-2">
//           {tokens.map((t) => (
//             <li key={t.tick} className="border p-2 rounded">
//               <strong>{t.tick}</strong> — balance: {t.balance}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }

// export default function HolderStats({ tick }: { tick: string }) {
//   const [stats, setStats] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!tick) return;

//     belIndexerApi
//       .getTokenHolderStats(tick)
//       .then(setStats)
//       .catch((err) => setError(err.message));
//   }, [tick]);

//   if (error) return <p>Error: {error}</p>;
//   if (!stats) return <p>Loading holder stats...</p>;

//   return (
//     <div>
//       <h2>📊 Holder Stats for {tick}</h2>
//       <pre>{JSON.stringify(stats, null, 2)}</pre>
//     </div>
//   );
// }

// export default function HoldersList({ tick }: { tick: string }) {
//   const [holders, setHolders] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function fetchHolders() {
//       try {
//         const data = await belIndexerApi.getTokenHolders(tick, { limit: 50 });
//         setHolders(data.holders || data.tokens || []); // adjust depending on backend structure
//       } catch (err: any) {
//         console.error(err);
//         setError(err.message || 'Failed to fetch holders');
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchHolders();
//   }, [tick]);

//   if (loading) return <p>Loading holders...</p>;
//   if (error) return <p>Error: {error}</p>;

//   return (
//     <div>
//       <h2>{tick} Holders</h2>
//       <ul>
//         {holders.map((holder, i) => (
//           <li key={i}>
//             {holder.address}: {holder.balance}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// export default function TokenEvents({ tick }: { tick: string }) {
//   const [events, setEvents] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     setLoading(true);
//     belIndexerApi
//       .getTokenEvents(tick, { limit: 20 })
//       .then((data) => {
//         setEvents(data.events || data || []);
//         setLoading(false);
//       })
//       .catch((err) => {
//         console.error(err);
//         setError(err.message);
//         setLoading(false);
//       });
//   }, [tick]);

//   if (loading) return <p>Loading events...</p>;
//   if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

//   return (
//     <div>
//       <h2>Token Events for {tick}</h2>
//       {events.length === 0 ? (
//         <p>No events found.</p>
//       ) : (
//         <ul>
//           {events.map((event, i) => (
//             <li key={i}>
//               <strong>{event.type}</strong> — {event.amount} by {event.address}
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }


// export default function TokenDetail({ tick = 'pepe' }: { tick: string }) {
//   const [token, setToken] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     belIndexerApi
//       .getToken(tick)
//       .then(setToken)
//       .catch((err) => setError(err.message));
//   }, [tick]);

//   if (error) return <p className="text-red-500">Error: {error}</p>;
//   if (!token) return <p>Loading token data...</p>;

//   return (
//     <div className="p-4 border rounded-lg">
//       <h2 className="font-semibold text-xl mb-2">{token.symbol}</h2>
//       <p>Name: {token.name}</p>
//       <p>Supply: {token.total_supply}</p>
//       <p>Holders: {token.holders}</p>
//       <pre className="mt-4 text-xs bg-gray-100 p-2 rounded">
//         {JSON.stringify(token, null, 2)}
//       </pre>
//     </div>
//   );
// }

// export default function BelStatus() {
//   const [status, setStatus] = useState<any>(null);

//   useEffect(() => {
//     belIndexerApi.getStatus().then(setStatus).catch(console.error);
//   }, []);

//   if (!status) return <p>Loading...</p>;

//   return <pre>{JSON.stringify(status, null, 2)}</pre>;
// }

// export default function PRCTwenty() {
//   const [tokens, setTokens] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function fetchTokens() {
//       try {
//         const res = await belIndexerApi.getTokens({
//           limit: 20,   // optional query params
//           page: 1,
//           sort: 'desc',
//         });
//         setTokens(res.tokens);
//       } catch (err) {
//         console.error('Error fetching tokens:', err);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchTokens();
//   }, []);

//   if (loading) return <p>Loading tokens...</p>;

//   return (
//     <div>
//       <h1>PRC-20 Tokens</h1>
//       <ul>
//         {tokens.map((t) => (
//           <li key={t.tick}>
//             <strong>{t.tick}</strong> — Supply: {t.supply}
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }