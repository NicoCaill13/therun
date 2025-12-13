import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RouteType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRouteDto {
  @ApiProperty({ example: 'Run du jeudi soir – Run & Drink' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' })
  @IsString()
  encodedPolyline: string;

  @ApiProperty({ example: RouteType })
  @IsOptional()
  @IsEnum(RouteType)
  type?: RouteType;
}
