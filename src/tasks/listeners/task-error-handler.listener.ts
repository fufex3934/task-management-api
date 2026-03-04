import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { catchError, retry, timeout, lastValueFrom } from 'rxjs';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class TaskErrorHandlerListener {
  private readonly logger = new Logger(TaskErrorHandlerListener.name);

  @OnEvent('task.created', { async: true })
  async handleWithRetry(event: any) {
    try {
      // Simulate operation that might fail
      await this.unreliableOperation(event);
    } catch (error) {
      this.logger.error(`Failed to handle event: ${error.message}`);

      // You could emit to a dead letter queue
      this.emitToDeadLetterQueue(event, error);
    }
  }

  private async unreliableOperation(event: any): Promise<void> {
    // Simulate random failure (20% chance)
    if (Math.random() < 0.2) {
      throw new Error('Random service failure');
    }
    this.logger.log(`✅ Successfully processed event: ${event.taskId}`);
  }

  private emitToDeadLetterQueue(event: any, error: Error) {
    this.logger.warn(`📝 Sending failed event to DLQ: ${event.taskId}`);
    // In real app, send to Kafka/RabbitMQ dead letter queue
  }
}

