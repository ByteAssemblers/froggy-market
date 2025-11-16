import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PepecoinService {
  private readonly rpcUrl: string;
  private readonly rpcUser: string;
  private readonly rpcPassword: string;

  constructor(private configService: ConfigService) {
    this.rpcUrl = this.configService.get<any>('PEPECOIN_RPC_URL');
    this.rpcUser = this.configService.get<any>('PEPECOIN_RPC_USER');
    this.rpcPassword = this.configService.get<any>('PEPECOIN_RPC_PASSWORD');

    if (!this.rpcUrl) {
      throw new Error('Pepecoin RPC URL is not configured');
    }
  }

  /**
   * Build RPC payload
   */
  private buildRpcPayload(method: string, params: any[] = []) {
    return {
      jsonrpc: '1.0',
      id: 'froggymarket',
      method,
      params,
    };
  }

  /**
   * Call Pepecoin RPC method
   */
  async callPepecoinRpc(
    method: string,
    params: any[] = [],
    timeout: number = 90000,
  ): Promise<any> {
    const config: any = {
      url: this.rpcUrl,
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      data: this.buildRpcPayload(method, params),
      timeout,
    };

    // Add authentication if credentials are provided
    if (this.rpcUser) {
      config.auth = {
        username: this.rpcUser,
        password: this.rpcPassword || '',
      };
    }

    try {
      console.log(
        `[HTTP OUT] [pepecoin] POST ${this.rpcUrl} (method=${method})`,
      );
      console.log('RPC Request:', JSON.stringify(config.data, null, 2));

      const response = await axios(config);

      console.log('RPC Response Status:', response.status);
      console.log('RPC Response Data:', JSON.stringify(response.data, null, 2));

      const { data } = response;

      if (data && typeof data === 'object') {
        if (data.error) {
          const err = data.error;
          const message =
            (err && typeof err === 'object' && err.message) ||
            String(err) ||
            'Pepecoin RPC error';
          const error: any = new Error(message);
          if (err && typeof err === 'object' && err.code !== undefined) {
            error.code = err.code;
          }
          error.rpcResponse = data;
          console.error('RPC Error:', error);
          throw error;
        }
        console.log('RPC Success, returning result:', data.result);
        return data.result;
      }

      throw new Error('Unexpected response from Pepecoin RPC');
    } catch (error: any) {
      console.error('RPC Call Failed:', error.message);
      console.error('Error Code:', error.code);
      console.error('Error Details:', error);

      if (error.response && typeof error.response.data === 'object') {
        const rpcData = error.response.data;
        console.error('RPC Error Response:', JSON.stringify(rpcData, null, 2));

        if (
          rpcData &&
          typeof rpcData.error === 'object' &&
          rpcData.error !== null
        ) {
          const { message, code } = rpcData.error;
          const rpcError: any = new Error(
            message || `Pepecoin RPC error (status ${error.response.status})`,
          );
          if (code !== undefined) {
            rpcError.code = code;
          }
          rpcError.rpcResponse = rpcData;
          throw rpcError;
        }
        const rpcError: any = new Error(
          `Pepecoin RPC HTTP ${error.response.status}: ${JSON.stringify(rpcData)}`,
        );
        rpcError.rpcResponse = rpcData;
        throw rpcError;
      }

      // Check for network/timeout errors
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Pepecoin node at ${this.rpcUrl}. Is the node running?`);
      }

      if (error.code === 'ETIMEDOUT') {
        throw new Error(`Connection to Pepecoin node timed out at ${this.rpcUrl}`);
      }

      if (error.code === 'ENOTFOUND') {
        throw new Error(`Cannot resolve Pepecoin node address: ${this.rpcUrl}`);
      }

      throw error;
    }
  }

  /**
   * Broadcast a raw transaction to the Pepecoin network
   */
  async broadcastPepecoinTransaction(
    rawHex: string,
    options: { allowHighFees?: boolean } = {},
  ): Promise<string> {
    const hex = typeof rawHex === 'string' ? rawHex.trim() : '';
    if (!hex) {
      throw new Error(
        'broadcastPepecoinTransaction: raw transaction hex is empty',
      );
    }

    const params: any[] = [hex];
    if (options.allowHighFees) {
      params.push(true);
    }

    return this.callPepecoinRpc('sendrawtransaction', params);
  }

  /**
   * Get raw transaction by txid
   */
  async getRawTransaction(
    txid: string,
    verbose: boolean = false,
  ): Promise<any> {
    if (!txid) {
      throw new Error('getRawTransaction: txid is required');
    }
    const params = verbose ? [txid, true] : [txid];
    return this.callPepecoinRpc('getrawtransaction', params);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txid: string): Promise<any> {
    try {
      const info = await this.callPepecoinRpc('getrawtransaction', [
        txid,
        true,
      ]);
      const confirmations =
        typeof info.confirmations === 'number' &&
        Number.isFinite(info.confirmations)
          ? info.confirmations
          : 0;
      return {
        txid: info.txid || txid,
        confirmed: confirmations > 0,
        confirmations,
        blockhash: info.blockhash || null,
        blocktime: info.blocktime || null,
        time: info.time || null,
        inMempool: confirmations === 0,
      };
    } catch (err: any) {
      if (err && err.code === -5) {
        try {
          const entry = await this.callPepecoinRpc('getmempoolentry', [txid]);
          return {
            txid,
            confirmed: false,
            confirmations: 0,
            inMempool: true,
            fees: entry.fees || null,
            size: entry.size,
            time: entry.time,
          };
        } catch (memErr: any) {
          if (memErr && memErr.code === -5) {
            return {
              txid,
              confirmed: false,
              confirmations: 0,
              inMempool: false,
              notFound: true,
            };
          }
          throw memErr;
        }
      }
      throw err;
    }
  }

  /**
   * Convert coins to koinu (satoshis)
   */
  private coinsToKoinu(amount: any): number {
    if (amount === undefined || amount === null) return 0;
    const numeric = Number(amount);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric * 1e8);
  }

  /**
   * Scan UTXOs by address using scantxoutset
   */
  async scanUtxosByAddress(address: string): Promise<any[]> {
    if (!address) {
      throw new Error('scanUtxosByAddress: address is required');
    }

    const descriptor = `addr(${address})`;
    try {
      const result = await this.callPepecoinRpc('scantxoutset', [
        'start',
        [descriptor],
      ]);

      if (!result || result.success === false) {
        const message =
          (result && result.error) ||
          'scantxoutset failed. Ensure your node supports descriptors and addr()';
        const error: any = new Error(message);
        error.rpcResponse = result || null;
        throw error;
      }

      const currentHeight =
        typeof result.height === 'number' && Number.isFinite(result.height)
          ? result.height
          : null;

      return (result.unspents || []).map((entry: any) => {
        const value = this.coinsToKoinu(entry.amount);
        const height =
          typeof entry.height === 'number' && Number.isFinite(entry.height)
            ? entry.height
            : null;
        const confirmations =
          height !== null &&
          currentHeight !== null &&
          height > 0 &&
          currentHeight >= height
            ? currentHeight - height + 1
            : 0;

        return {
          txid: entry.txid,
          vout: entry.vout,
          value,
          amount: entry.amount,
          scriptPubKey: entry.scriptPubKey,
          height,
          confirmations,
          descriptor: entry.desc || descriptor,
        };
      });
    } catch (error: any) {
      // Fallback to listunspent if scantxoutset is not supported
      if (error && error.code === -32601) {
        return this.listUnspentByAddress(address);
      }
      throw error;
    }
  }

  /**
   * List unspent outputs by address (fallback method)
   */
  async listUnspentByAddress(address: string): Promise<any[]> {
    const utxos = await this.callPepecoinRpc('listunspent', [
      0,
      9999999,
      [address],
    ]);

    if (!Array.isArray(utxos)) {
      return [];
    }

    return utxos.map((entry: any) => ({
      txid: entry.txid,
      vout: entry.vout,
      value: this.coinsToKoinu(entry.amount),
      amount: entry.amount,
      scriptPubKey: entry.scriptPubKey,
      confirmations:
        typeof entry.confirmations === 'number' &&
        Number.isFinite(entry.confirmations)
          ? entry.confirmations
          : 0,
      descriptor: null,
    }));
  }
}
