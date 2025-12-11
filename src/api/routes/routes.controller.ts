import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { RouteDto } from './dto/route.dto';
import { JwtUser } from '@/types/jwt';
import { CurrentUser } from '@/infrastructure/auth/user.decorator';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) { }

  // POST /routes → créer un parcours “library”
  @Post()
  async createRoute(@CurrentUser() user: JwtUser, @Body() dto: CreateRouteDto): Promise<RouteDto> {
    return this.routesService.createRoute(user, dto);
  }

  // GET /routes/:routeId → détail
  @Get(':routeId')
  async getRoute(@Param('routeId') routeId: string, @CurrentUser() user: JwtUser): Promise<RouteDto> {
    return this.routesService.getRouteById(routeId, user);
  }

  // GET /routes?createdBy=me → “Mes parcours”
  @Get()
  async listRoutes(@CurrentUser() user: JwtUser, @Query('createdBy') createdBy?: string): Promise<RouteDto[]> {
    return this.routesService.listRoutes(user, createdBy);
  }
}
