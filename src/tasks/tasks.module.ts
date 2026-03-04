import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskListeners } from './listeners/task.listener';
import { TaskScheduleListener } from './listeners/task-schedule.listeners';
import { TaskErrorHandlerListener } from './listeners/task-error-handler.listener';
import { OwnerGuard } from './guards/owner.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    ScheduleModule.forRoot(),
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskListeners,
    TaskScheduleListener,
    TaskErrorHandlerListener,
    OwnerGuard,
  ],
})
export class TasksModule {}
