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

  //find one tak by id
  async findOne(id: string, userId: string, userRole: string): Promise<Task> {
    const task = await this.taskModel
      .findById(id)
      .populate('userId', 'email name')
      .exec();

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check ownership: admin can access any task, users only their own
    if (userRole !== 'admin' && task.userId.toString() !== userId) {
      throw new ForbiddenException('You can only access your own tasks');
    }

    return task;
  }

  //update a task

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
    userRole: string,
  ): Promise<TaskDocument | null> {
    const task = await this.taskModel.findById(id).exec();

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check ownership
    if (userRole !== 'admin' && task.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own tasks');
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
}
