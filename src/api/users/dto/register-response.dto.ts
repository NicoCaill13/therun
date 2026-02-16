import { ApiProperty } from '@nestjs/swagger';

class RegisterUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty()
  firstName!: string;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty()
  isGuest!: boolean;

  @ApiProperty()
  plan!: string;
}

export class RegisterResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: RegisterUserDto })
  user!: RegisterUserDto;

  @ApiProperty()
  mergedFromGuest!: boolean;
}
