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
  UseGuards,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

type CurrentUserPayload = { sub: string; email: string; role?: string };

@Controller('tasks')
@UseGuards(AuthGuard('jwt')) //protect all routes in this controller with JWT authentication
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: CurrentUserPayload, // Get the authenticated user from the request
  ): Promise<Task> {
    // You could associate task with user here
    console.log('Creating task for user:', user.email);
    return await this.tasksService.create(createTaskDto, user.sub);
  }

  @Get()
  async getAllTasks(@CurrentUser() user: CurrentUserPayload): Promise<Task[]> {
    console.log('User', user.email, 'fetching all tasks');
    return await this.tasksService.findAll(user.sub, user.role || 'user');
  }

  @Get(':id')
  async getTaskById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<Task> {
    return await this.tasksService.findOne(id, user.sub, user.role || 'user');
  }

  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body()
    updateData: UpdateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<TaskDocument | null> {
    return this.tasksService.update(
      id,
      updateData,
      user.sub,
      user.role || 'user',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard) // Then, check roles for this specific route
  @Roles('admin') // Only admins can delete tasks
  async deleteTask(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<void> {
    // Even though only admins can call this, we still check ownership
    // to prevent admin from deleting non-existent tasks
    return this.tasksService.delete(id, user.sub, user.role || 'user');
  }

  // Special admin-only endpoint
  @Get('admin/stats')
  @UseGuards(RolesGuard)
  @Roles('admin')
  getAdminStats(@CurrentUser() user: CurrentUserPayload) {
    return {
      message: `Welcome Admin ${user.email}`,
    };
  }
}
