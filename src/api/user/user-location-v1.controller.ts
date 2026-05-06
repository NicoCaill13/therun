import {
  BadRequestException,
  Controller,
  Headers,
  Patch,
  Body,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateMyLocationDto } from './dto/update-my-location.dto';
import { UserLocationService } from './user-location.service';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UserLocationV1Controller {
  constructor(private readonly userLocationService: UserLocationService) {}

  @Patch('me/location')
  @ApiOperation({
    summary: 'Update last known GPS for radar (issue #113)',
    description:
      'MVP: identify caller with X-User-Id until auth is wired. Optional expoPushToken registers the device for push.',
  })
  @ApiHeader({ name: 'X-User-Id', required: true })
  @ApiOkResponse({ description: 'Location stored' })
  @ApiBadRequestResponse()
  async updateMyLocation(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() dto: UpdateMyLocationDto,
  ): Promise<{ ok: true }> {
    const userId = userIdHeader?.trim();
    if (!userId) {
      throw new BadRequestException('X-User-Id header is required');
    }
    await this.userLocationService.updateMyLocation(userId, dto);
    return { ok: true };
  }
}
