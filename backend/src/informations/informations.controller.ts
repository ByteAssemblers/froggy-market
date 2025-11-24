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
  async getCollectionInfo(@Query('nft') nft: string) {
    if (!nft) {
      throw new BadRequestException('Query parameter "nft" is required');
    }
    return this.informationsService.getCollectionInfo(nft);
  }

  @Get('prc20-info')
  async getPrc20Info(@Query('tick') tick: string) {
    if (!tick) {
      throw new BadRequestException('Query parameter "tick" is required');
    }
    return this.informationsService.getPrc20Info(tick);
  }
}
