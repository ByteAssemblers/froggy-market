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
import { CreateCollectionDto } from './dto/create-collection.dto';

@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Post()
  async create(@Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(dto);
  }

  @Get()
  async findAll() {
    const collections = await this.collectionsService.findAll();

    // Transform listings to activities for frontend compatibility
    return collections.map(collection => ({
      ...collection,
      inscriptions: collection.inscriptions.map(inscription => ({
        ...inscription,
        activities: inscription.listings.map(listing => ({
          ...listing,
          state: listing.status,
        })),
      })),
    }));
  }
}
