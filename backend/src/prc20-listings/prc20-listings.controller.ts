import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { Prc20ListingsService } from './prc20-listings.service';

@Controller('prc20-listings')
export class Prc20ListingsController {
  constructor(private readonly prc20ListingsService: Prc20ListingsService) {}

  /**
   * POST /api/prc20-listings/list
   * List a prc20 for sale
   */
  @Post('list')
  async listPrc20(
    @Body()
    dto: {
      inscriptionId: string;
      prc20Label: string;
      amount: number;
      priceSats: number;
      sellerAddress: string;
      psbtBase64?: string;
    },
  ) {
    return this.prc20ListingsService.listPrc20(dto);
  }

  /**
   * POST /api/prc20-listings/buy
   * Buy a prc20
   */
  @Post('buy')
  async buyPrc20(
    @Body()
    dto: {
      inscriptionId: string;
      buyerAddress: string;
      priceSats: number;
      txid?: string;
    },
  ) {
    return this.prc20ListingsService.buyPrc20(dto);
  }

  /**
   * POST /api/prc20-listings/unlist
   * Unlist a prc20
   */
  @Post('unlist')
  async unlistPrc20(
    @Body() dto: { inscriptionId: string; sellerAddress: string },
  ) {
    return this.prc20ListingsService.unlistPrc20(dto);
  }

  /**
   * POST /api/prc20-listings/send
   * Record a prc20 send transaction
   */
  @Post('send')
  async sendPrc20(
    @Body()
    dto: {
      inscriptionId: string;
      prc20Label: string;
      amount: number;
      fromAddress: string;
      toAddress: string;
      txid: string;
    },
  ) {
    return this.prc20ListingsService.sendPrc20(dto);
  }

  /**
   * POST /api/prc20-listings/inscribe
   * Record a prc20 inscription (transfer status)
   */
  @Post('inscribe')
  async handleInscribe(
    @Body()
    dto: {
      inscriptionId: string;
      prc20Label: string;
      amount: number;
      sellerAddress: string;
      txid: string;
    },
  ) {
    return this.prc20ListingsService.handleInscribe(dto);
  }

  /**
   * GET /api/prc20-listings/inscription/:inscriptionId
   * Get prc20 listing status
   */
  @Get('inscription/:inscriptionId')
  async getPrc20Status(@Param('inscriptionId') inscriptionId: string) {
    return this.prc20ListingsService.getPrc20Status(inscriptionId);
  }

  /**
   * GET /api/prc20-listings/active
   * Get all active prc20 listings
   */
  @Get('active')
  async getActivePrc20Listings() {
    return this.prc20ListingsService.getActivePrc20Listings();
  }

  /**
   * GET /api/prc20-listings/activity?tick=frog
   * Get activity for a specific PRC20 token or all tokens (listed, unlisted, sold)
   */
  @Get('activity')
  async getActivity(@Query('tick') tick?: string) {
    return this.prc20ListingsService.getActivity(tick);
  }

  /**
   * GET /api/prc20-listings/transaction?tick=frog
   * Get transactions for a specific PRC20 token or all tokens (sold, transfer)
   */
  @Get('transaction')
  async getTransactions(@Query('tick') tick?: string) {
    return this.prc20ListingsService.getTransactions(tick);
  }
}
