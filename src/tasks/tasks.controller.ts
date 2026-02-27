import { Body, Controller, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './schemas/task.schema';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  async createTask(
    @Body() createTaskDto: { title: string; description?: string },
  ): Promise<Task> {
    return await this.tasksService.create(createTaskDto);
  }
}

