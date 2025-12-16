import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class InviteSearchItemDto {
  @IsString()
  id: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName: string | null;

  @IsOptional()
  @IsString()
  email: string | null;
}

export class InviteSearchResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteSearchItemDto)
  items: InviteSearchItemDto[];

  @IsInt()
  @Min(1)
  page: number;

  @IsInt()
  @Min(1)
  pageSize: number;

  @IsInt()
  @Min(0)
  totalCount: number;

  @IsInt()
  @Min(0)
  totalPages: number;
}
