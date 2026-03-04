//Base event class
export class TaskEvent {
  constructor(
    public readonly taskId: string,
    public readonly userId: string,
    public readonly timestamp: Date = new Date(),
  ) {}
}

// specific events

export class TaskCreatedEvent extends TaskEvent {
  constructor(
    taskId: string,
    userId: string,
    public readonly title: string,
    public readonly description?: string,
  ) {
    super(taskId, userId);
  }
}

export class TaskCompletedEvent extends TaskEvent {
  constructor(
    taskId: string,
    userId: string,
    public readonly completedAt: Date,
  ) {
    super(taskId, userId);
  }
}

export class TaskDeletedEvent extends TaskEvent {
  constructor(
    taskId: string,
    userId: string,
    public readonly reason?: string,
  ) {
    super(taskId, userId);
  }
}

export class TaskOverdueEvent extends TaskEvent {
  constructor(
    taskId: string,
    userId: string,
    public readonly dueDate: Date,
    public readonly daysOverdue: number,
  ) {
    super(taskId, userId);
  }
}
