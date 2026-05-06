import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller({ path: 'ping', version: VERSION_NEUTRAL })
export class PingController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({
    schema: {
      example: { status: 'ok' },
    },
  })
  ping(): { status: string } {
    return { status: 'ok' };
  }
}
