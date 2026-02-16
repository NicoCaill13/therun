import { ApiProperty } from '@nestjs/swagger';

class LoginUserDto {
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

export class LoginResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: LoginUserDto })
  user!: LoginUserDto;
}
