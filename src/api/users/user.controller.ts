import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { UserService } from './user.service';

@ApiTags('Auth')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiOperation({ summary: 'Create an account (merges Guest if same email)' })
  @ApiCreatedResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse({
    description: 'Validation / Terms not accepted',
    schema: { example: { statusCode: 400, error: 'Bad Request', message: 'Terms must be accepted' } },
  })
  @ApiConflictResponse({
    description: 'Email already used by a full account',
    schema: { example: { statusCode: 409, error: 'Conflict', message: 'Email already used' } },
  })
  register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    return this.userService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate with email and password' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: { example: { statusCode: 401, error: 'Unauthorized', message: 'Invalid credentials' } },
  })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.userService.login(dto);
  }
}
