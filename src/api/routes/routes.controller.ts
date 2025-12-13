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

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) { }

  // POST /routes → créer un parcours “library”
  @Post()
  async createRoute(@CurrentUser() user: JwtUser, @Body() dto: CreateRouteDto): Promise<RouteDto> {
    return this.routesService.createRoute(user, dto);
  }
  // GET /routes?createdBy=me → “Mes parcours”
  @Get()
  async listRoutes(
    @CurrentUser() user: JwtUser,
    @Query('createdBy') createdBy?: string,
    @Query('page') pageRaw?: string,
    @Query('pageSize') pageSizeRaw?: string,
  ): Promise<RouteListResponseDto> {
    const page = pageRaw ? parseInt(pageRaw, 10) : undefined;
    const pageSize = pageSizeRaw ? parseInt(pageSizeRaw, 10) : undefined;
    return this.routesService.listRoutes(user, {
      createdBy,
      page,
      pageSize,
    });
  }

  @Get('suggest')
  suggest(@CurrentUser() user: JwtUser, @Query() query: SuggestRoutesQueryDto): Promise<SuggestRoutesResponseDto> {
    return this.routesService.suggestRoutes(user, query);
  }

  @Get(':routeId')
  async getRoute(@Param('routeId') routeId: string, @CurrentUser() user: JwtUser): Promise<RouteDto> {
    return this.routesService.getRouteById(routeId, user);
  }
}
