import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  async getAll() {
    return this.listingsService.getActiveListings();
  }

  @Post('list')
  async list(@Body() body: any) {
    return this.listingsService.listNFT(body);
  }

  @Post('buy')
  async buy(
    @Body()
    body: {
      listingId: string;
      buyerWif: string;
      buyerReceiveAddress?: string;
      platformAddress?: string;
      platformFeeSats?: number;
    },
  ) {
    return this.listingsService.buyNFT(body);
  }

  @Post('unlist')
  async unlistByInscription(@Body() body: { inscriptionId: string; sellerAddress: string }) {
    return this.listingsService.unlistByInscription(body);
  }

  @Get('wallet/:address')
  async getByWallet(@Param('address') address: string) {
    return this.listingsService.getInscriptionsByWallet(address);
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.listingsService.getListingById(id);
  }

  @Get('inscription/:inscriptionId/status')
  async getInscriptionStatus(@Param('inscriptionId') inscriptionId: string) {
    return this.listingsService.getLatestListingStatus(inscriptionId);
  }

  @Get('inscription/:inscriptionId/history')
  async getInscriptionHistory(@Param('inscriptionId') inscriptionId: string) {
    return this.listingsService.getInscriptionHistory(inscriptionId);
  }
}
