import {
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(3, {
    message: 'Title is too short. Minimum 3 characters required.',
  })
  @MaxLength(50, {
    message: 'Title is too long. Maximum 50 characters allowed.',
  })
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(200, {
    message: 'Description is too long. Maximum 200 characters allowed.',
  })
  description?: string;

  @IsMongoId() // We'll set this from the controller, not from user input
  @IsOptional()
  userId?: string;
}
