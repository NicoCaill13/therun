import { ApiProperty } from '@nestjs/swagger';

export class MyOnboardingStateDto {
  @ApiProperty({ example: false })
  hasCompletedOnboarding!: boolean;

  @ApiProperty({ example: false })
  consentDataBrokering!: boolean;
}
