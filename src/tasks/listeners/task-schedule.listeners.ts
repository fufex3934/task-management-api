import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from '../schemas/task.schema';
import { TaskOverdueEvent } from '../../events/task.events';

@Injectable()
export class TaskScheduleListener {
  private readonly logger = new Logger(TaskScheduleListener.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // Run every hour
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    this.logger.log('🔍 Checking for overdue tasks...');

    // Find tasks that are overdue (older than 7 days and not completed)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const overdueTasks = await this.taskModel
      .find({
        status: { $ne: 'completed' },
        createdAt: { $lt: sevenDaysAgo },
      })
      .exec();

    for (const task of overdueTasks) {
      const daysOverdue = Math.floor(
        (Date.now() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      const event = new TaskOverdueEvent(
        task._id.toString(),
        task.userId.toString(),
        task.createdAt,
        daysOverdue,
      );

      this.eventEmitter.emit('task.overdue', event);
    }

    this.logger.log(`Found ${overdueTasks.length} overdue tasks`);
  }

  // Run every day at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async sendDailyDigest() {
    this.logger.log('📊 Sending daily task digest...');

    // Aggregate tasks by user
    const tasksByUser = await this.taskModel.aggregate([
      {
        $group: {
          _id: '$userId',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
          },
        },
      },
    ]);

    // Emit digest event
    this.eventEmitter.emit('daily.digest', tasksByUser);
  }
}
