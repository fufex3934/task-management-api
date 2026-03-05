import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { LoggerService } from 'src/logger/logger.service';
import { TaskEvent } from 'src/events/task.events';
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';
@WebSocketGateway({
  cors: {
    origin: '*', // In production , restrict this to frontend url
    credentials: true,
  },
  namespace: 'tasks', // All websocket connections go to /tasks namespace
})
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track connected users (roomId -> Set of userIds)
  private userRooms = new Map<string, Set<string>>();

  // Track user's socket connections (userId -> Set of socketIds)
  private userSockets = new Map<string, Set<string>>();

  constructor(private logger: LoggerService) {}

  /**
   * When a client connects to WebSocket
   */
  async handleConnection(client: Socket) {
    try {
      // Extract user from handshake auth (we'll implement this)
      const user = await this.authenticatedSocket(client);

      // Store connection
      this.addUserConnection(user.id, client.id);

      this.logger.log(
        `📡 Client connected: ${client.id} - User: ${user.email}`,
        'WebSocket',
      );

      // Send welcome message
      client.emit('connected', {
        message: 'Connected to task server',
        userId: user.id,
        socketId: client.id,
      });

      // Join user to their personal room (for private messages)
      client.join(`user:${user.id}`);
    } catch (error) {
      this.logger.error(
        `Connection failed: ${error.message}`,
        error.stack,
        'WebSocket',
      );
      client.disconnect();
    }
  }

  /**
   * When a client disconnects
   */
  async handleDisconnect(client: Socket) {
    try {
      const user = client.data.user;

      if (user) {
        this.removeUserConnection(user.id, client.id);

        this.logger.log(
          `📡 Client disconnected: ${client.id} - User: ${user.email}`,
          'WebSocket',
        );
      }
    } catch (error) {
      this.logger.error(
        `Disconnect error: ${error.message}`,
        error.stack,
        'WebSocket',
      );
    }
  }

  /**
   * Join a task room to receive updates about specific task
   */
  @SubscribeMessage('joinTask')
  async handleJoinTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    const user = client.data.user;
    const roomId = `task:${data.taskId}`;

    // Join the room
    await client.join(roomId);

    // Track user in this room
    this.addUserToRoom(roomId, user.id);

    this.logger.log(
      `👤 User ${user.email} joined task room: ${data.taskId}`,
      'WebSocket',
    );

    // Notify others in the room
    client.to(roomId).emit('userJoined', {
      userId: user.id,
      email: user.email,
      taskId: data.taskId,
      timestamp: new Date(),
    });
    return {
      event: 'joinedTask',
      data: {
        taskId: data.taskId,
        activeUsers: this.getUsersInRoom(roomId),
      },
    };
  }

  /**
   * Leave a task room
   */
  @SubscribeMessage('leaveTask')
  async handleLeaveTask(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string },
  ) {
    const user = client.data.user;
    const roomId = `task:${data.taskId}`;

    await client.leave(roomId);
    this.removeUserFromRoom(roomId, user.id);

    this.logger.log(
      `👋 User ${user.email} left task room: ${data.taskId}`,
      'WebSocket',
    );

    // Notify others
    client.to(roomId).emit('userLeft', {
      userId: user.id,
      email: user.email,
      taskId: data.taskId,
      timestamp: new Date(),
    });
  }

  /**
   * Send a comment on a task (real-time)
   */
  @SubscribeMessage('sendComment')
  async handleSendComment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string; comment: string },
  ) {
    const user = client.data.user;
    const roomId = `task:${data.taskId}`;

    // Create comment object
    const comment = {
      id: this.generateId(),
      taskId: data.taskId,
      userId: user.id,
      userEmail: user.email,
      content: data.comment,
      timestamp: new Date(),
    };

    this.logger.log(
      `💬 User ${user.email} commented on task ${data.taskId}: ${data.comment.substring(0, 30)}...`,
      'WebSocket',
    );

    // Broadcast to everyone in the room (including sender)
    this.server.to(roomId).emit('newComment', comment);

    return { event: 'commentSent', data: comment };
  }

  /**
   * Typing indicator (shows when someone is typing)
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { taskId: string; isTyping: boolean },
  ) {
    const user = client.data.user;
    const roomId = `task:${data.taskId}`;

    // Broadcast typing status to others in room (not to sender)
    client.to(roomId).emit('userTyping', {
      userId: user.id,
      email: user.email,
      taskId: data.taskId,
      isTyping: data.isTyping,
      timestamp: new Date(),
    });
  }

  // ========== Public Methods (called from other parts of app) ==========

  /**
   * Notify all clients about new task
   */
  notifyTaskCreated(task: any) {
    this.server.emit('taskCreated', {
      ...task,
      notification: 'New task created!',
      timestamp: new Date(),
    });
  }

  /**
   * Notify clients in specific task room about update
   */
  notifyTaskUpdated(taskId: string, updateData: any) {
    const roomId = `task:${taskId}`;
    this.server.to(roomId).emit('taskUpdated', {
      taskId,
      ...updateData,
      timestamp: new Date(),
    });
  }

  /**
   * Notify specific user (private message)
   */
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date(),
    });
  }

  // ========== Private Helper Methods ==========

  private async authenticatedSocket(client: Socket): Promise<any> {
    // Get token from handshake
    const token =
      client.handshake.auth.token || client.handshake.headers.authorization;

    if (!token) {
      throw new WsException('Missing authentication token');
    }

    // TODO: Implement JWT validation
    // For now, return mock user
    const mockUser = {
      id: 'user_' + Math.random().toString(36).substring(7),
      email: 'user@example.com',
      role: 'user',
    };

    // Attach user to socket for later use
    client.data.user = mockUser;
    return mockUser;
  }

  private addUserConnection(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
  }

  private removeUserConnection(userId: string, socketId: string) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  private addUserToRoom(roomId: string, userId: string) {
    if (!this.userRooms.has(roomId)) {
      this.userRooms.set(roomId, new Set());
    }
    this.userRooms.get(roomId)!.add(userId);
  }

  private removeUserFromRoom(roomId: string, userId: string) {
    const room = this.userRooms.get(roomId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) {
        this.userRooms.delete(roomId);
      }
    }
  }

  private getUsersInRoom(roomId: string): string[] {
    return Array.from(this.userRooms.get(roomId) || []);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
