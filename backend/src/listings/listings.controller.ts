import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ListingsService } from './listings.service';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post('list')
  async listNFT(
    @Body()
    dto: {
      inscriptionId: string;
      priceSats: number;
      sellerAddress: string;
      psbtBase64?: string;
    },
  ) {
    return this.listingsService.listNFT(dto);
  }

  @Post('buy')
  async buyNFT(
    @Body()
    dto: {
      inscriptionId: string;
      buyerAddress: string;
      priceSats: number;
      txid?: string;
    },
  ) {
    return this.listingsService.buyNFT(dto);
  }

  @Post('unlist')
  async unlistNFT(
    @Body()
    dto: {
      inscriptionId: string;
      sellerAddress: string;
    },
  ) {
    return this.listingsService.unlistNFT(dto);
  }

  @Get()
  async getActiveListings() {
    return this.listingsService.getActiveListings();
  }

  @Get('inscription/:inscriptionId')
  async getInscriptionListingStatus(
    @Param('inscriptionId') inscriptionId: string,
  ) {
    return this.listingsService.getInscriptionListingStatus(inscriptionId);
  }
}
