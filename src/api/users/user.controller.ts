import { Body, Controller, Post } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { UserService } from './user.service';

class RegisterResponseDto {
  accessToken!: string;
  user!: {
    id: string;
    email: string | null;
    firstName: string;
    lastName: string | null;
    isGuest: boolean;
    plan: string;
  };
  mergedFromGuest!: boolean;
}

@ApiTags('Auth')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('register')
  @ApiOperation({ summary: 'Créer un compte complet (fusionne un Guest si email identique)' })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation / Terms non acceptées',
    schema: { example: { statusCode: 400, error: 'Bad Request', message: 'Terms must be accepted' } },
  })
  @ApiConflictResponse({
    description: 'Email déjà utilisé par un compte complet',
    schema: { example: { statusCode: 409, error: 'Conflict', message: 'Email already used' } },
  })
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.userService.register(dto);
  }
}
