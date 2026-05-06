import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SkipSuccessWrap } from '@/infrastructure/http/skip-success-wrap.decorator';
import { CreateSpontaneousRunDto } from './dto/create-spontaneous-run.dto';
import { SpontaneousRunResponseDto } from './dto/spontaneous-run-response.dto';
import { UpdateSpontaneousRunDto } from './dto/update-spontaneous-run.dto';
import { SpontaneousRunService } from './spontaneous-run.service';

@ApiTags('spontaneous-runs')
@Controller({ path: 'spontaneous-runs', version: VERSION_NEUTRAL })
export class SpontaneousRunController {
  constructor(private readonly spontaneousRunService: SpontaneousRunService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a spontaneous run (issue #111)' })
  @ApiCreatedResponse({ type: SpontaneousRunResponseDto })
  @ApiBadRequestResponse({ description: 'Validation or unknown creatorId' })
  create(
    @Body() createDto: CreateSpontaneousRunDto,
  ): Promise<SpontaneousRunResponseDto> {
    return this.spontaneousRunService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'List spontaneous runs' })
  @ApiOkResponse({ type: SpontaneousRunResponseDto, isArray: true })
  findAll(): Promise<SpontaneousRunResponseDto[]> {
    return this.spontaneousRunService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one spontaneous run' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: SpontaneousRunResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id') id: string): Promise<SpontaneousRunResponseDto> {
    return this.spontaneousRunService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update spontaneous run' })
  @ApiParam({ name: 'id' })
  @ApiOkResponse({ type: SpontaneousRunResponseDto })
  @ApiNotFoundResponse()
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSpontaneousRunDto,
  ): Promise<SpontaneousRunResponseDto> {
    return this.spontaneousRunService.update(id, updateDto);
  }

  @Delete(':id')
  @SkipSuccessWrap()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete spontaneous run' })
  @ApiParam({ name: 'id' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  remove(@Param('id') id: string): Promise<void> {
    return this.spontaneousRunService.remove(id);
  }
}
