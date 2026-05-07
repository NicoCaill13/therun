import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Patch,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MyOnboardingStateDto } from './dto/my-onboarding-state.dto';
import { UpdateMyOnboardingDto } from './dto/update-my-onboarding.dto';
import { UserOnboardingService } from './user-onboarding.service';

@ApiTags('users')
@Controller({ path: 'users', version: '1' })
export class UserOnboardingV1Controller {
  constructor(private readonly userOnboardingService: UserOnboardingService) {}

  @Get('me/onboarding')
  @ApiOperation({
    summary: 'Get Le Pacte onboarding and data-brokering consent flags (issue #112)',
    description: 'MVP: caller identified with X-User-Id until auth is wired.',
  })
  @ApiHeader({ name: 'X-User-Id', required: true })
  @ApiOkResponse({ type: MyOnboardingStateDto })
  @ApiNotFoundResponse()
  async getMyOnboarding(
    @Headers('x-user-id') userIdHeader: string | undefined,
  ): Promise<MyOnboardingStateDto> {
    const userId = userIdHeader?.trim();
    if (!userId) {
      throw new BadRequestException('X-User-Id header is required');
    }
    return this.userOnboardingService.getMyOnboarding(userId);
  }

  @Patch('me/onboarding')
  @ApiOperation({
    summary: 'Update onboarding / consent flags (issue #112)',
    description:
      'Partial update: send at least one of hasCompletedOnboarding or consentDataBrokering.',
  })
  @ApiHeader({ name: 'X-User-Id', required: true })
  @ApiOkResponse({ type: MyOnboardingStateDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  async patchMyOnboarding(
    @Headers('x-user-id') userIdHeader: string | undefined,
    @Body() dto: UpdateMyOnboardingDto,
  ): Promise<MyOnboardingStateDto> {
    const userId = userIdHeader?.trim();
    if (!userId) {
      throw new BadRequestException('X-User-Id header is required');
    }
    return this.userOnboardingService.patchMyOnboarding(userId, dto);
  }
}
