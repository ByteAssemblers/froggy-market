import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  async create(@Body() body: any) {
    return this.collectionsService.createCollection(
      body.name,
      body.symbol,
      body.description,
      body.profileInscriptionId,
      body.onlineUrl,
      body.myUrl,
      body.totalSupply,
      body.inscriptionsList,
      body.walletAddress,
    );
  }

  @Get()
  async findAll() {
    return this.collectionsService.getCollections();
  }

  @Get(':walletAddress')
  async getCollectionsByWalletAddress(
    @Param('walletAddress') walletAddress: string,
  ) {
    return this.collectionsService.getCollectionsByWalletAddress(walletAddress);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: any) {
    return this.collectionsService.updateCollection(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.collectionsService.deleteCollection(id);
  }
}
