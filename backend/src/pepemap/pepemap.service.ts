import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PepecoinService } from '../pepecoin/pepecoin.service';
import { PNG } from 'pngjs';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

const DEFAULT_CANVAS_SIZE = 256;
const DEFAULT_MARGIN = 8;
const DEFAULT_GUTTER = 4;
const DEFAULT_MIN_SIDE = 2;
const PRIMARY_FILL_FACTOR = 0.8;
const MAX_LAYOUT_ATTEMPTS = 12;

interface Transaction {
  txid: string;
  size: number;
}

interface Square {
  txid: string;
  sizeBytes: number;
  index: number;
  side: number;
  x?: number;
  y?: number;
}

@Injectable()
export class PepemapService {
  private pendingGenerations = new Map<number, Promise<string>>();
  private outputDir: string;

  constructor(private readonly pepecoinService: PepecoinService) {
    // Use frontend's public pepemaps directory
    this.outputDir = path.resolve(
      __dirname,
      '../../../../frontend/public/pepemaps',
    );
  }

  /**
   * Ensure pepemap image exists, generate if needed
   */
  async ensurePepemapImage(
    blockHeight: number,
    force = false,
  ): Promise<string> {
    const filename = `${blockHeight}.png`;
    const filePath = path.join(this.outputDir, filename);

    // Check if file already exists
    if (!force) {
      try {
        await fsp.access(filePath, fs.constants.F_OK);
        console.log(`[Pepemap] Using cached image for block ${blockHeight}`);
        return filePath;
      } catch (err) {
        // File doesn't exist, proceed to generation
        console.log(`[Pepemap] Generating new image for block ${blockHeight}`);
      }
    }

    // Check if generation is already in progress
    if (this.pendingGenerations.has(blockHeight)) {
      console.log(`[Pepemap] Generation already in progress for block ${blockHeight}`);
      return this.pendingGenerations.get(blockHeight)!;
    }

    // Start generation
    const generationPromise = (async () => {
      try {
        await fsp.mkdir(this.outputDir, { recursive: true });
        const png = await this.generatePepemap(blockHeight);
        await this.writePng(png, filePath);
        console.log(`[Pepemap] Successfully generated image for block ${blockHeight}`);
        return filePath;
      } catch (error: any) {
        console.error(`[Pepemap] Generation failed for block ${blockHeight}:`, error.message);
        // Remove file if partially written
        try {
          await fsp.unlink(filePath);
        } catch {}
        throw error;
      }
    })()
      .finally(() => {
        this.pendingGenerations.delete(blockHeight);
      });

    this.pendingGenerations.set(blockHeight, generationPromise);
    return generationPromise;
  }

  /**
   * Generate pepemap PNG from block data
   */
  private async generatePepemap(blockHeight: number): Promise<PNG> {
    const blockData = await this.fetchBlockData(blockHeight);
    const layout = this.layoutTransactions(blockData.tx, {
      canvasSize: DEFAULT_CANVAS_SIZE,
      margin: DEFAULT_MARGIN,
      gutter: DEFAULT_GUTTER,
      minSide: DEFAULT_MIN_SIDE,
    });

    return this.renderPepemap(layout, {
      canvasSize: DEFAULT_CANVAS_SIZE,
      margin: DEFAULT_MARGIN,
    });
  }

  /**
   * Fetch block data from Pepecoin RPC
   */
  private async fetchBlockData(height: number): Promise<any> {
    try {
      console.log(`[Pepemap] Fetching block data for height ${height}...`);

      // Get block hash
      const hash = await this.pepecoinService.callPepecoinRpc('getblockhash', [
        height,
      ]);
      const normalizedHash =
        typeof hash === 'string' ? hash.trim() : String(hash);

      if (!normalizedHash) {
        throw new Error(`Unable to resolve hash for block height ${height}.`);
      }

      console.log(`[Pepemap] Block hash: ${normalizedHash}`);

      // Get block with full transaction data (verbosity = 2)
      const block = await this.pepecoinService.callPepecoinRpc('getblock', [
        normalizedHash,
        2,
      ]);

      if (!block || typeof block !== 'object' || !Array.isArray(block.tx)) {
        throw new Error(`Block ${height} response missing transactions.`);
      }

      console.log(`[Pepemap] Block ${height} has ${block.tx.length} transactions`);
      return block;
    } catch (error: any) {
      console.error(`[Pepemap] Error fetching block ${height}:`, error.message);

      // Check if it's a block not found error
      if (error.code === -5 || error.message?.includes('not found')) {
        throw new HttpException(
          {
            error: 'Block not found',
            details: `Block ${height} does not exist`,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          error: 'Failed to fetch block data',
          details: error.message,
          blockHeight: height,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Layout transactions as squares
   */
  private layoutTransactions(
    transactions: Transaction[],
    options: {
      canvasSize: number;
      margin: number;
      gutter: number;
      minSide: number;
    },
  ): Square[] {
    const { canvasSize, margin, gutter, minSide } = options;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('Block does not contain any transactions to map.');
    }

    const totalSize = transactions.reduce(
      (sum, tx) => sum + Math.max(tx.size || 0, 1),
      0,
    );

    if (totalSize === 0) {
      throw new Error('All transactions report size 0. Aborting layout.');
    }

    // Sort by size (largest first)
    const sorted = transactions
      .map((tx, index) => ({
        txid: tx.txid,
        sizeBytes: Math.max(tx.size || 0, 1),
        index,
        side: 0,
      }))
      .sort((a, b) => b.sizeBytes - a.sizeBytes);

    // Try multiple fill factors
    const fillFactors = [
      PRIMARY_FILL_FACTOR,
      ...Array.from(
        { length: MAX_LAYOUT_ATTEMPTS - 1 },
        (_, idx) => PRIMARY_FILL_FACTOR - (idx + 1) * 0.05,
      ),
      0.3,
      0.25,
    ].filter(
      (factor, index, array) => factor > 0 && array.indexOf(factor) === index,
    );

    for (const factor of fillFactors) {
      const attempt = this.tryLayout(sorted, {
        canvasSize,
        margin,
        gutter,
        minSide,
        fillFactor: factor,
      });
      if (attempt) {
        return attempt;
      }
    }

    throw new Error('Unable to layout squares within the canvas bounds.');
  }

  /**
   * Try to layout squares with given fill factor
   */
  private tryLayout(
    items: Square[],
    options: {
      canvasSize: number;
      margin: number;
      gutter: number;
      minSide: number;
      fillFactor: number;
    },
  ): Square[] | null {
    const { canvasSize, margin, gutter, minSide, fillFactor } = options;
    const usableWidth = canvasSize - margin * 2;
    const usableHeight = canvasSize - margin * 2;
    const totalArea = usableWidth * usableHeight * fillFactor;
    const totalValue = items.reduce((sum, item) => sum + item.sizeBytes, 0);
    const maxSide = Math.sqrt(totalArea);

    const squares = items.map((item) => {
      const normalizedArea = (item.sizeBytes / totalValue) * totalArea;
      const side = Math.max(minSide, Math.sqrt(normalizedArea));
      return { ...item, side };
    });

    squares.sort((a, b) => b.side - a.side);

    let cursorX = margin;
    let cursorY = margin;
    let rowHeight = 0;

    for (const square of squares) {
      const side = Math.min(maxSide, square.side);
      const roundedSide = Math.max(minSide, Math.round(side));

      if (cursorX + roundedSide > canvasSize - margin) {
        cursorX = margin;
        cursorY += rowHeight + gutter;
        rowHeight = 0;
      }

      if (cursorY + roundedSide > canvasSize - margin) {
        return null;
      }

      square.x = cursorX;
      square.y = cursorY;
      square.side = roundedSide;

      cursorX += roundedSide + gutter;
      rowHeight = Math.max(rowHeight, roundedSide);
    }

    return squares;
  }

  /**
   * Render pepemap PNG from layout
   */
  private renderPepemap(
    squares: Square[],
    options: { canvasSize: number; margin: number },
  ): PNG {
    const { canvasSize } = options;
    const png = new PNG({ width: canvasSize, height: canvasSize });

    // Fill background with transparent black
    this.fillRect(png, 0, 0, canvasSize, canvasSize, {
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    });

    const maxBytes = Math.max(...squares.map((square) => square.sizeBytes));

    // Draw each transaction square
    for (const square of squares) {
      const intensity = square.sizeBytes / maxBytes;
      const green = Math.floor(120 + intensity * 120);
      const blue = Math.floor(20 + intensity * 60);
      const color = { r: 10, g: Math.min(green, 255), b: blue, a: 255 };

      this.fillRect(png, square.x!, square.y!, square.side, square.side, color);
    }

    return png;
  }

  /**
   * Fill rectangle on PNG
   */
  private fillRect(
    png: PNG,
    x: number,
    y: number,
    width: number,
    height: number,
    color: { r: number; g: number; b: number; a: number },
  ): void {
    const clampedX = Math.max(0, Math.min(png.width, x));
    const clampedY = Math.max(0, Math.min(png.height, y));
    const clampedWidth = Math.max(0, Math.min(png.width - clampedX, width));
    const clampedHeight = Math.max(0, Math.min(png.height - clampedY, height));

    for (let row = 0; row < clampedHeight; row++) {
      for (let col = 0; col < clampedWidth; col++) {
        this.setPixel(
          png,
          clampedX + col,
          clampedY + row,
          color.r,
          color.g,
          color.b,
          color.a,
        );
      }
    }
  }

  /**
   * Set pixel color on PNG
   */
  private setPixel(
    png: PNG,
    x: number,
    y: number,
    r: number,
    g: number,
    b: number,
    a: number,
  ): void {
    if (x < 0 || x >= png.width || y < 0 || y >= png.height) {
      return;
    }
    const idx = (png.width * y + x) << 2;
    const data = png.data;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = a;
  }

  /**
   * Write PNG to file
   */
  private writePng(png: PNG, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filePath);
      png.pack().pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}
