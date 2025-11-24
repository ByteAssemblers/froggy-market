import { Controller, Get, Query } from '@nestjs/common';
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
}
