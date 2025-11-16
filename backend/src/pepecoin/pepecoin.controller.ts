import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PepecoinService } from './pepecoin.service';

@Controller('pepecoin')
export class PepecoinController {
  constructor(private readonly pepecoinService: PepecoinService) {}

  /**
   * Parse allowHighFees query parameter
   */
  private parseAllowHighFees(value: any): boolean {
    if (value === undefined || value === null) return false;
    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  /**
   * Broadcast a raw transaction to the network
   * POST /api/pepecoin/tx
   * Accepts text/plain body with raw transaction hex
   */
  @Post('tx')
  async broadcastTransaction(
    @Body() rawBody: any,
    @Query('allowHighFees') allowHighFeesParam?: string,
  ) {
    try {
      // Handle both text and JSON bodies
      let raw: string;
      let allowHighFees = false;

      if (typeof rawBody === 'string') {
        raw = rawBody.trim();
        allowHighFees = this.parseAllowHighFees(allowHighFeesParam);
      } else if (rawBody && typeof rawBody === 'object' && rawBody.rawHex) {
        raw = rawBody.rawHex.trim();
        // Read allowHighFees from body if present, otherwise from query param
        allowHighFees = rawBody.allowHighFees ?? this.parseAllowHighFees(allowHighFeesParam);
      } else {
        throw new HttpException(
          {
            error: 'pepecoin broadcast failed',
            details: 'empty payload',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!raw) {
        throw new HttpException(
          {
            error: 'pepecoin broadcast failed',
            details: 'empty payload',
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const txid = await this.pepecoinService.broadcastPepecoinTransaction(
        raw,
        { allowHighFees },
      );

      return {
        success: true,
        txid,
        message: 'Transaction broadcast successfully',
      };
    } catch (error: any) {
      const status = error.code === -26 ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          error: 'pepecoin broadcast failed',
          details: error.message,
          code: error.code,
          rpcResponse: error.rpcResponse || null,
        },
        status,
      );
    }
  }

  /**
   * Broadcast transaction (alternative endpoint for JSON body)
   * POST /api/pepecoin/broadcast
   */
  @Post('broadcast')
  async broadcastTransactionJson(
    @Body() dto: { rawHex: string; allowHighFees?: boolean },
  ) {
    try {
      const { rawHex, allowHighFees = false } = dto;

      if (!rawHex) {
        throw new HttpException(
          {
            error: 'pepecoin broadcast failed',
            details: 'rawHex is required',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const txid = await this.pepecoinService.broadcastPepecoinTransaction(
        rawHex,
        { allowHighFees },
      );

      return {
        success: true,
        txid,
        message: 'Transaction broadcast successfully',
      };
    } catch (error: any) {
      const status = error.code === -26 ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          error: 'pepecoin broadcast failed',
          details: error.message,
          code: error.code,
          rpcResponse: error.rpcResponse || null,
        },
        status,
      );
    }
  }

  /**
   * Get raw transaction hex
   * GET /api/pepecoin/tx/:txid/hex
   */
  @Get('tx/:txid/hex')
  async getRawTransactionHex(@Param('txid') txid: string) {
    try {
      const result = await this.pepecoinService.getRawTransaction(txid, false);
      const hex = typeof result === 'string' ? result : (result as any)?.hex;

      if (!hex) {
        throw new HttpException(
          {
            error: 'pepecoin tx hex failed',
            details: 'transaction not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return { txid, hex };
    } catch (error: any) {
      const status = error.code === -5 ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          error: 'pepecoin tx hex failed',
          details: error.message,
          code: error.code,
          rpcResponse: error.rpcResponse || null,
        },
        status,
      );
    }
  }

  /**
   * Get transaction status
   * GET /api/pepecoin/tx/:txid/status
   */
  @Get('tx/:txid/status')
  async getTransactionStatus(@Param('txid') txid: string) {
    try {
      const statusInfo = await this.pepecoinService.getTransactionStatus(txid);

      if ((statusInfo as any).notFound) {
        throw new HttpException(statusInfo, HttpStatus.NOT_FOUND);
      }

      return statusInfo;
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }

      const status = error.code === -5 ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          error: 'pepecoin tx status failed',
          details: error.message,
          code: error.code,
          rpcResponse: error.rpcResponse || null,
        },
        status,
      );
    }
  }

  /**
   * Get UTXOs for an address
   * GET /api/pepecoin/address/:address/utxo
   */
  @Get('address/:address/utxo')
  async getAddressUtxos(@Param('address') address: string) {
    try {
      const utxos = await this.pepecoinService.scanUtxosByAddress(address);
      return utxos;
    } catch (error: any) {
      if (error && error.code === -32601) {
        throw new HttpException(
          {
            error: 'pepecoin address utxo failed',
            details: 'Node does not support descriptor scanning or listunspent RPC',
            code: error.code,
            rpcResponse: error.rpcResponse || null,
          },
          HttpStatus.NOT_IMPLEMENTED,
        );
      }

      const status = error.code === -5 ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException(
        {
          error: 'pepecoin address utxo failed',
          details: error.message,
          code: error.code,
          rpcResponse: error.rpcResponse || null,
        },
        status,
      );
    }
  }
}
