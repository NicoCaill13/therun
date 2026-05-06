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
} from '@nestjs/common';
import { CreateSpontaneousRunDto } from './dto/create-spontaneous-run.dto';
import type { SpontaneousRunResponseDto } from './dto/spontaneous-run-response.dto';
import { UpdateSpontaneousRunDto } from './dto/update-spontaneous-run.dto';
import { SpontaneousRunService } from './spontaneous-run.service';

@Controller('spontaneous-runs')
export class SpontaneousRunController {
  constructor(private readonly spontaneousRunService: SpontaneousRunService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createSpontaneousRunDto: CreateSpontaneousRunDto,
  ): Promise<SpontaneousRunResponseDto> {
    return this.spontaneousRunService.create(createSpontaneousRunDto);
  }

  @Get()
  findAll(): Promise<SpontaneousRunResponseDto[]> {
    return this.spontaneousRunService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<SpontaneousRunResponseDto> {
    return this.spontaneousRunService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSpontaneousRunDto: UpdateSpontaneousRunDto,
  ): Promise<SpontaneousRunResponseDto> {
    return this.spontaneousRunService.update(id, updateSpontaneousRunDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.spontaneousRunService.remove(id);
  }
}
