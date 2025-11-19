import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PepemapListingsService } from './pepemap-listings.service';

@Controller('pepemap-listings')
export class PepemapListingsController {
  constructor(
    private readonly pepemapListingsService: PepemapListingsService,
  ) {}

  /**
   * POST /api/pepemap-listings/list
   * List a pepemap for sale
   */
  @Post('list')
  async listPepemap(
    @Body()
    dto: {
      inscriptionId: string;
      pepemapLabel: string;
      priceSats: number;
      sellerAddress: string;
      psbtBase64?: string;
    },
  ) {
    return this.pepemapListingsService.listPepemap(dto);
  }

  /**
   * POST /api/pepemap-listings/buy
   * Buy a pepemap
   */
  @Post('buy')
  async buyPepemap(
    @Body()
    dto: {
      inscriptionId: string;
      buyerAddress: string;
      priceSats: number;
      txid?: string;
    },
  ) {
    return this.pepemapListingsService.buyPepemap(dto);
  }

  /**
   * POST /api/pepemap-listings/unlist
   * Unlist a pepemap
   */
  @Post('unlist')
  async unlistPepemap(
    @Body() dto: { inscriptionId: string; sellerAddress: string },
  ) {
    return this.pepemapListingsService.unlistPepemap(dto);
  }

  /**
   * POST /api/pepemap-listings/send
   * Record a pepemap send transaction
   */
  @Post('send')
  async sendPepemap(
    @Body()
    dto: {
      inscriptionId: string;
      pepemapLabel: string;
      fromAddress: string;
      toAddress: string;
      txid: string;
    },
  ) {
    return this.pepemapListingsService.sendPepemap(dto);
  }

  /**
   * GET /api/pepemap-listings/inscription/:inscriptionId
   * Get pepemap listing status
   */
  @Get('inscription/:inscriptionId')
  async getPepemapStatus(@Param('inscriptionId') inscriptionId: string) {
    return this.pepemapListingsService.getPepemapStatus(inscriptionId);
  }

  /**
   * GET /api/pepemap-listings/active
   * Get all active pepemap listings
   */
  @Get('active')
  async getActivePepemapListings() {
    return this.pepemapListingsService.getActivePepemapListings();
  }
}
