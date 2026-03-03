import { IsEnum, IsOptional } from 'class-validator';
import { CreateTaskDto } from './create-task.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsEnum(['pending', 'in-progress', 'completed'], {
    message:
      'Status must be one of the following: pending, in-progress, completed',
  })
  status?: string;
}
