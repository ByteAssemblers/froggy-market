import { FloorPrice } from "./pepemap";

export interface CollectionInfo {
  symbol?: string;
  name?: string;
  floorPrice: number;
  change24h: number;
  volume24h: number;
  totalVolume: number;
  trades24h: number;
  owners: number;
  supply: number;
  listed: number;
}

export interface CollectionActive {
  id: string;
  name: string;
  symbol: string;
  description: string;
  profileInscriptionId: string;
  socialLink: string;
  personalLink: string | "";
  totalSupply: number;
  walletAddress: string;
  approve: boolean;
  createdAt: Date;
  updatedAt: Date;
  inscriptions: Inscription[];
}

export interface Inscription {
  id: string;
  collectionId: string;
  inscriptionId: string;
  name: string;
  attributes: any | null;
  createdAt: Date;
  updatedAt: Date;
  listings: Listing[];
  activities: Activity[];
}

export interface Listing {
  id: string;
  inscriptionId: string;
  status: "unlisted" | "listed" | "sold" | "sent";
  psbtBase64: string | null;
  priceSats: number | null;
  sellerAddress: string;
  buyerAddress: string | null;
  txid: string | null;
  createdAt: Date;
}

export interface Activity {
  id: string;
  inscriptionId: string;
  status: "unlisted" | "listed" | "sold" | "sent";
  psbtBase64: string | null;
  priceSats: number | null;
  sellerAddress: string;
  buyerAddress: string | null;
  txid: string | null;
  createdAt: Date;
  state: "unlisted" | "listed" | "sold" | "sent";
}

export interface Collection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  profileInscriptionId: string;
  socialLink: string;
  personalLink: string | "";
  totalSupply: number;
  walletAddress: string;
  approve: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inscription {
  id: string;
  collectionId: string;
  inscriptionId: string;
  name: string;
  attributes: any | null;
  createdAt: Date;
  updatedAt: Date;
  collection: Collection;
}

export interface Activities {
  id: string;
  inscriptionId: string;
  status: "sold";
  psbtBase64: null;
  priceSats: number;
  sellerAddress: string;
  buyerAddress: string;
  txid: string;
  createdAt: Date;
  inscription: Inscription;
}

export interface CollectionActivity {
  symbol: string;
  name: string;
  activity: Activities[];
}

export interface CollectionFloorPrice {
  symbol: string;
  name: string;
  history: FloorPrice[];
}
