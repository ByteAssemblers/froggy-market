import { Controller, Post, Get, Body, Param, Query, BadRequestException } from '@nestjs/common';
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

  @Post('send')
  async sendNFT(
    @Body()
    dto: {
      inscriptionId: string;
      fromAddress: string;
      toAddress: string;
      txid: string;
    },
  ) {
    return this.listingsService.sendNFT(dto);
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

  @Get('activity')
  async getSoldActivity(@Query('collection') collection: string) {
    if (!collection) {
      throw new BadRequestException('Query parameter "collection" is required');
    }
    return this.listingsService.getSoldActivity(collection);
  }
}
