import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { InformationsService } from './informations.service';

@Controller('informations')
export class InformationsController {
  constructor(private readonly informationsService: InformationsService) {}

  @Get('biggest-sales-of-day')
  async getBiggestSalesOfDay() {
    return this.informationsService.getBiggestSalesOfDay();
  }

  @Get('pepemap-info')
  async getPepemapInfo() {
    return this.informationsService.getPepemapInfo();
  }

  @Get('collection-info')
  async getCollectionInfo(@Query('nft') nft?: string) {
    return this.informationsService.getCollectionInfo(nft);
  }

  @Get('prc20-info')
  async getPrc20Info(@Query('tick') tick?: string) {
    return this.informationsService.getPrc20Info(tick);
  }

  @Get('marketplace-stats')
  async getMarketplaceStats() {
    return this.informationsService.getMarketplaceStats();
  }

  @Get('pepemap-floorprice')
  async getPepemapFloorPriceHistory() {
    return this.informationsService.getPepemapFloorPriceHistory();
  }

  @Get('collection-floorprice')
  async getCollectionFloorPriceHistory(@Query('nft') nft?: string) {
    return this.informationsService.getCollectionFloorPriceHistory(nft);
  }

  @Get('prc20-floorprice')
  async getPrc20FloorPriceHistory(@Query('tick') tick?: string) {
    return this.informationsService.getPrc20FloorPriceHistory(tick);
  }

  @Get('wallet-history')
  async getWalletHistory(@Query('address') address: string) {
    if (!address) {
      throw new BadRequestException('Query parameter "address" is required');
    }
    return this.informationsService.getWalletHistory(address);
  }

  @Get('wallet-activity')
  async getWalletActivity(@Query('address') address: string) {
    if (!address) {
      throw new BadRequestException('Query parameter "address" is required');
    }
    return this.informationsService.getWalletActivity(address);
  }
}
