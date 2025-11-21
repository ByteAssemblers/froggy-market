import { Controller, Post, Get, Body, Param } from '@nestjs/common';
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
}
