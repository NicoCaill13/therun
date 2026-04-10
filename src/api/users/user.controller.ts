import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserService } from './user.service';
import { JwtAuthGuard } from '@/infrastructure/auth/jwt-auth.guard';

class AuthUserResponseShape {
  id!: string;
  email!: string | null;
  firstName!: string;
  lastName!: string | null;
  isGuest!: boolean;
  plan!: string;
}

class RegisterResponseDto {
  accessToken!: string;
  user!: AuthUserResponseShape;
  mergedFromGuest!: boolean;
}

class LoginResponseDto {
  accessToken!: string;
  user!: AuthUserResponseShape;
}

@ApiTags('Auth')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

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

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion email + mot de passe' })
  @ApiUnauthorizedResponse({
    description: 'Identifiants invalides',
    schema: { example: { statusCode: 401, message: 'Invalid credentials' } },
  })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.userService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Déconnexion',
    description: 'JWT stateless: le client doit supprimer le jeton. Cette route vérifie le jeton puis répond 204.',
  })
  @ApiUnauthorizedResponse({ description: 'Jeton absent ou invalide' })
  logout(): void {
    return;
  }
}
