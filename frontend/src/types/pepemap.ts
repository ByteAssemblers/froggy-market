export interface PepemapInfo {
  floorPrice: number;
  change24h: number;
  volume24h: number;
  totalVolume: number;
  trades24h: number;
  listed: number;
}

export interface PepemapActive {
  id: string;
  pepemapLabel: string;
  inscriptionId: string;
  blockNumber: number;
  status: "listed";
  psbtBase64: string;
  priceSats: number;
  sellerAddress: string;
  buyerAddress: null;
  txid: null;
  createdAt: Date;
}

export interface PepemapActivity {
  id: string;
  pepemapLabel: string;
  inscriptionId: string;
  blockNumber: number;
  status: "sold";
  psbtBase64: null;
  priceSats: number;
  sellerAddress: string;
  buyerAddress: string;
  txid: string;
  createdAt: Date;
}

export interface FloorPrice {
  date: Date;
  floorPrice: number;
}
