import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { Model } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskNotFoundException } from './exceptions/task-not-found.exception';

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<TaskDocument>) {}

  //create  a new task
  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    const newTask = new this.taskModel(createTaskDto);
    return newTask.save();
  }

  //find all tasks
  async findAll(): Promise<Task[]> {
    return this.taskModel.find().exec();
  }

  //find one tak by id
  async findOne(id: string): Promise<Task> {
    const task = await this.taskModel.findById(id).exec();
    if (!task) {
      throw new TaskNotFoundException(id);
    }
    return task;
  }

  //update a task
  async update(id: string, updateData: Partial<Task>): Promise<Task> {
    const updatedTask = await this.taskModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
    if (!updatedTask) {
      throw new TaskNotFoundException(id);
    }
    return updatedTask;
  }

  //delete a task
  async delete(id: string): Promise<Task> {
    const deletedTask = await this.taskModel.findByIdAndDelete(id).exec();
    if (!deletedTask) {
      throw new TaskNotFoundException(id);
    }
    return deletedTask;
  }
}
