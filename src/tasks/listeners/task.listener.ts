import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TaskCreatedEvent,
  TaskCompletedEvent,
  TaskDeletedEvent,
} from '../../events/task.events';

@Injectable()
export class TaskListeners {
  private readonly logger = new Logger(TaskListeners.name);

  // Listen for specific event
  @OnEvent('task.created')
  async handleTaskCreated(event: TaskCreatedEvent) {
    this.logger.log(`🎯 Handling task.created: ${event.title}`);

    // Simulate different background jobs
    await Promise.all([
      this.sendWelcomeEmail(event),
      this.updateUserStatistics(event),
      this.notifyTeam(event),
    ]);
  }

  // You can have multiple listeners for same event
  @OnEvent('task.created')
  notherHandlerForSameEvent(event: TaskCreatedEvent) {
    this.logger.log(`📊 Analytics tracking for task: ${event.taskId}`);
    // Track for analytics
  }

  @OnEvent('task.completed')
  async handleTaskCompleted(event: TaskCompletedEvent) {
    this.logger.log(`✅ Task ${event.taskId} completed!`);

    // Send congratulatory email
    await this.sendCompletionEmail(event);

    // Update leaderboard
    await this.updateLeaderboard(event);
  }

  @OnEvent('task.deleted')
  async handleTaskDeleted(event: TaskDeletedEvent) {
    this.logger.log(`🗑️ Task ${event.taskId} deleted`);

    // Clean up any associated files
    await this.cleanupAttachments(event.taskId);

    // Update statistics
    await this.decrementUserTaskCount(event.userId);
  }

  // Listen to all task events using wildcard
  @OnEvent('task.*')
  handleAllTaskEvents(event: any) {
    this.logger.debug(`📡 Task event received: ${event.constructor.name}`);
    // Universal logging for all task events
  }

  // Private methods simulating background jobs
  private async sendWelcomeEmail(event: TaskCreatedEvent) {
    // Simulate email sending
    this.logger.log(`📧 Sending welcome email for task: ${event.title}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async updateUserStatistics(event: TaskCreatedEvent) {
    this.logger.log(`📈 Updating stats for user: ${event.userId}`);
    // Update user's task count
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  private async notifyTeam(event: TaskCreatedEvent) {
    this.logger.log(`👥 Notifying team about new task`);
    // Post to Slack/Teams
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  private sendCompletionEmail(event: TaskCompletedEvent) {
    this.logger.log(`🏆 Sending congratulations for task completion`);
  }

  private updateLeaderboard(event: TaskCompletedEvent) {
    this.logger.log(`📊 Updating leaderboard for user: ${event.userId}`);
  }

  private cleanupAttachments(taskId: string) {
    this.logger.log(`🧹 Cleaning up attachments for task: ${taskId}`);
  }

  private decrementUserTaskCount(userId: string) {
    this.logger.log(`📉 Decrementing task count for user: ${userId}`);
  }
}
