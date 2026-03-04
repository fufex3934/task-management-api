import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task, TaskDocument } from '../schemas/task.schema';
import { Model } from 'mongoose';
import { Request } from 'express';

// Define a custom interface that extends Request
interface RequestWithUser extends Request {
  user: {
    id: string;
    role: string;
    // add other user properties as needed
  };
  task?: TaskDocument; // Make task optional but available after guard execution
}

@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const taskIdParam = request.params.id;

    // Handle case where id might be an array or undefined
    const taskId = Array.isArray(taskIdParam) ? taskIdParam[0] : taskIdParam;

    // Check if taskId exists
    if (!taskId) {
      throw new NotFoundException('Task ID is required');
    }

    const user = request.user;

    // Check if user exists
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Find the task by ID
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    // Check if the user is the admin or the owner of the task
    const isOwner = task.userId.toString() === user.id;
    const isAdmin = user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You can only access your own task');
    }

    // Attach the task to request for later use (optional but useful)
    request.task = task;
    return true;
  }
}
