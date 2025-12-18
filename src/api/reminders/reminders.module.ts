import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule { }
