import { NotFoundException } from '@nestjs/common';

export class TaskNotFoundException extends NotFoundException {
  constructor(taskId: string) {
    super(`Task with id ${taskId} not found`);
  }
}
