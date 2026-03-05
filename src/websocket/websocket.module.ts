import { Module, Global } from '@nestjs/common';
import { TasksGateway } from '../tasks/tasks.gateway';
import { AuthModule } from '../auth/auth.module';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [AuthModule, LoggerModule],
  providers: [TasksGateway],
  exports: [TasksGateway],
})
export class WebSocketModule {}
