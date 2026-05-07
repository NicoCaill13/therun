import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/** Partial PATCH body; at least one field must be present (enforced in service). */
export class UpdateMyOnboardingDto {
  @ApiPropertyOptional({
    description: 'Whether the user finished the Le Pacte onboarding flow (issue #112).',
  })
  @IsOptional()
  @IsBoolean()
  hasCompletedOnboarding?: boolean;

  @ApiPropertyOptional({
    description:
      'Opt-in for anonymized urban data contribution; app remains fully usable when false.',
  })
  @IsOptional()
  @IsBoolean()
  consentDataBrokering?: boolean;
}
