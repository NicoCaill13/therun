import { Module } from '@nestjs/common';
import { JoinController } from './join.controller';
import { JoinService } from './join.service';

@Module({
  controllers: [JoinController],
  providers: [JoinService],
})
export class JoinModule {}
