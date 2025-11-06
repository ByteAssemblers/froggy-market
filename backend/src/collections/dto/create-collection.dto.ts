import { IsString, IsBoolean, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  name: string;

  @IsString()
  symbol: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  profileInscriptionId?: string;

  @IsOptional()
  @IsString()
  socialLink?: string;

  @IsOptional()
  @IsString()
  personalLink?: string;

  @IsOptional()
  @IsNumber()
  totalSupply?: number;

  @IsString()
  wallet: string;

  @IsArray()
  inscriptions: {
    name: string;
    inscriptionId: string;
    attributes: any;
  }[];
}
