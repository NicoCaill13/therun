// src/api/routes/dto/route-list.dto.ts
import { Type } from 'class-transformer';
import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { RouteDto } from './route.dto';

export class RouteListResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteDto)
  items: RouteDto[];

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
