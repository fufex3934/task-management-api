import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number) // Transform string to number
  @IsInt()
  @Min(1)
  page: number = 1; // Default to page 1

  @IsOptional()
  @Type(() => Number) // Transform string to number
  @IsInt()
  @Min(1)
  @Max(100) // prevent excessive requests
  limit: number = 10; // Default to 10 items per page
}

// For returning paginated response
export class PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
