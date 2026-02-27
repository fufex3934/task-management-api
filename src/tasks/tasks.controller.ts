import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
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

  @Get()
  async getAllTasks(): Promise<Task[]> {
    return await this.tasksService.findAll();
  }

  @Get(':id')
  async getTaskById(@Param('id') id: string): Promise<Task> {
    return await this.tasksService.findOne(id);
  }

  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body()
    updateData: { title?: string; description?: string; status?: string },
  ): Promise<Task> {
    return await this.tasksService.update(id, updateData as Partial<Task>);
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string): Promise<Task> {
    return await this.tasksService.delete(id);
  }
}
