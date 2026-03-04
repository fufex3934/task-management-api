import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PaginatedResponse, PaginationDto } from './dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  //create  a new task
  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const taskWithUser = {
      ...createTaskDto,
      userId: new Types.ObjectId(userId), // Associate task with user
    };
    const newTask = new this.taskModel(taskWithUser);
    return newTask.save();
  }

  //find all tasks
  async findAll(userId: string, userRole: string): Promise<Task[]> {
    // Admin sees all tasks, users see only their own
    const filter =
      userRole === 'admin' ? {} : { userId: new Types.ObjectId(userId) };
    return this.taskModel.find(filter).populate('userId', 'email name').exec();
  }

  //find one task by id
  async findOne(id: string): Promise<Task> {
    const task = await this.taskModel
      .findById(id)
      .populate('userId', 'email name')
      .exec();

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  //update a task

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskDocument | null> {
    const task = await this.taskModel.findById(id).exec();

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .exec();
  }

  //delete a task
  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const task = await this.taskModel.findById(id).exec();

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check ownership: only admin can delete any task, users delete only their own
    if (userRole !== 'admin' && task.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own tasks');
    }

    await this.taskModel.findByIdAndDelete(id).exec();
  }

  async findAllPaginated(
    userId: string,
    userRole: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<Task>> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit; // Calculate how many to skip

    // Build filter based on role
    const filter =
      userRole === 'admin' ? {} : { userId: new Types.ObjectId(userId) };

    // Get total count for pagination metadata
    const total = await this.taskModel.countDocuments(filter).exec();

    // Get paginated data
    const data = await this.taskModel
      .find(filter)
      .populate('userId', 'email name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }) // Newest first
      .exec();

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }
}
