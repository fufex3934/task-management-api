import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PaginatedResponse, PaginationDto } from './dto/pagination.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  TaskCompletedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
} from 'src/events/task.events';
import { TasksGateway } from './tasks.gateway';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private eventEmitter: EventEmitter2,
    private tasksGateway: TasksGateway,
  ) {}

  //create  a new task
  async create(createTaskDto: CreateTaskDto, userId: string): Promise<Task> {
    const taskWithUser = {
      ...createTaskDto,
      userId: new Types.ObjectId(userId), // Associate task with user
    };
    const newTask = new this.taskModel(taskWithUser);
    const savedTask = await newTask.save();

    // Emit event that task was created
    const event = new TaskCreatedEvent(
      savedTask._id.toString(),
      userId,
      savedTask.title,
      savedTask.description,
    );

    this.eventEmitter.emit('task.created', event);

    // NEW: WebSocket notification
    const populatedTask = await this.taskModel
      .findById(savedTask._id)
      .populate('userId', 'email name')
      .exec();

    this.tasksGateway.notifyTaskCreated(populatedTask);
    return savedTask;
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
    const task = await this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .exec();

    // Check if task was completed
    if (task && updateTaskDto.status === 'completed') {
      const event = new TaskCompletedEvent(
        task._id.toString(),
        task.userId.toString(),
        new Date(),
      );
      this.eventEmitter.emit('task.completed', event);
    }

    // NEW: WebSocket notification for task update
    if (task) {
      this.tasksGateway.notifyTaskUpdated(id, {
        title: task.title,
        status: task.status,
        updatedBy: task.userId,
      });
    }
    return task;
  }

  //delete a task
  async delete(id: string): Promise<void> {
    const task = await this.taskModel.findByIdAndDelete(id).exec();

    if (task) {
      const event = new TaskDeletedEvent(
        task._id.toString(),
        task.userId.toString(),
        'User deleted task',
      );
      this.eventEmitter.emit('task.deleted', event);
    }
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
