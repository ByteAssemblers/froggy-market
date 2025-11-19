import {
  Controller,
  Get,
  Param,
  Res,
  HttpException,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { PepemapService } from './pepemap.service';
import type { Response } from 'express';
import * as fs from 'fs';

@Controller('pepemap')
export class PepemapController {
  constructor(private readonly pepemapService: PepemapService) {}

  /**
   * GET /api/pepemap/:blockNumber
   * Generate and return pepemap image for a block
   */
  @Get(':blockNumber')
  async getPepemap(
    @Param('blockNumber', ParseIntPipe) blockNumber: number,
    @Res() res: Response,
  ) {
    try {
      if (blockNumber < 0) {
        throw new HttpException(
          'Block number must be non-negative',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Ensure image exists (generate if needed)
      const filePath = await this.pepemapService.ensurePepemapImage(
        blockNumber,
      );

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new HttpException(
          'Failed to generate pepemap image',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Serve the PNG file
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error('Pepemap generation error:', error.message);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          error: 'Failed to generate pepemap',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
