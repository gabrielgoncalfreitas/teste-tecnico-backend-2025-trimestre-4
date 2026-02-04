import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class HealthResponse {
  @ApiProperty({ example: 'OK' })
  status: string;

  @ApiProperty({ example: '2026-02-04T13:31:06.000Z' })
  timestamp: string;
}
