import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteDto } from './dto/route.dto';
import { JwtUser } from '@/types/jwt';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';
import { RouteListResponseDto } from './dto/route-list.dto';
import { SuggestRoutesQueryDto } from './dto/suggest-routes-query.dto';
import { SuggestRoutesResponseDto } from './dto/suggest-routes-response.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ListRoutesQueryDto } from './dto/list-routes-query.dto';

@ApiTags('routes')
@ApiBearerAuth()
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) { }

  @Post()
  @ApiOperation({ summary: 'Créer un parcours library' })
  @ApiResponse({ status: 201, type: RouteDto })
  @ApiBadRequestResponse({ description: 'Bad Request (DTO validation)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async createRoute(@CurrentUser() user: JwtUser, @Body() dto: CreateRouteDto): Promise<RouteDto> {
    return this.routesService.createRoute(user, dto);
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Suggestions de parcours (MVP)' })
  @ApiResponse({ status: 200, type: SuggestRoutesResponseDto })
  @ApiBadRequestResponse({ description: 'Bad Request (DTO validation)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  suggest(@CurrentUser() user: JwtUser, @Query() query: SuggestRoutesQueryDto): Promise<SuggestRoutesResponseDto> {
    return this.routesService.suggestRoutes(user, query);
  }

  @Get(':routeId')
  @ApiOperation({ summary: 'Détail d’un parcours' })
  @ApiResponse({ status: 200, type: RouteDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Not Found' })
  async getRoute(@Param('routeId') routeId: string, @CurrentUser() user: JwtUser): Promise<RouteDto> {
    return this.routesService.getRouteById(routeId, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lister / rechercher des parcours (distance + zone)' })
  @ApiQuery({ name: 'createdBy', required: false, enum: ['me'] })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'radiusMeters', required: false, type: Number })
  @ApiQuery({ name: 'distanceMin', required: false, type: Number })
  @ApiQuery({ name: 'distanceMax', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: RouteListResponseDto })
  @ApiBadRequestResponse({ description: 'Bad Request (DTO validation)' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async listRoutes(@CurrentUser() user: JwtUser, @Query() query: ListRoutesQueryDto): Promise<RouteListResponseDto> {
    return this.routesService.listRoutes(user, query);
  }
}
