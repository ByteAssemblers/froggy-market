import { Activity } from "./collections";
import { FloorPrice } from "./pepemap";

export interface Prc20Token {
  height: number;
  created: number;
  tick: string;
  genesis: string;
  deployer: string;
  transactions: number;
  mint_count: number;
  holders: number;
  supply: number;
  mint_percent: number;
  completed: boolean;
  max: number;
  lim: number;
  dec: number;
}

export interface Prc20Info {
  tick: string;
  floorPrice: number;
  change24h: number;
  volume24h: number;
  totalVolume: number;
}

export interface Prc20Active {
  id: string;
  prc20Label: string;
  inscriptionId: string;
  amount: number;
  status: "listed";
  psbtBase64: string;
  priceSats: number;
  sellerAddress: string;
  buyerAddress: null;
  txid: null;
  createdAt: Date;
}

export interface Prc20Activity {
  tick: string;
  activity: Activity[];
}

export interface Prc20FloorPrice {
  tick: string;
  history: FloorPrice[];
}

export interface Prc20Transaction {
  tick: string;
  transactions: Transaction[];
}

export interface Transaction {
  id: string;
  prc20Label: string;
  inscriptionId: string;
  amount: number;
  status: "transfer" | "sold";
  psbtBase64: string | null;
  priceSats: number | null;
  sellerAddress: string;
  buyerAddress: string | null;
  txid: string;
  createdAt: Date;
}
