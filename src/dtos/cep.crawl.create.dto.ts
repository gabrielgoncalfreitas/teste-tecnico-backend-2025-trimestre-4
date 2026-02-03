import { ApiProperty } from '@nestjs/swagger';

export class CepCrawlCreateDTO {
  @ApiProperty({
    example: '01001000',
    description: 'CEP de início',
    required: true,
    minLength: 8,
    maxLength: 8,
    pattern: '^[0-9]{8}$',
  })
  cep_start: string;

  @ApiProperty({
    example: '01001000',
    description: 'CEP de fim',
    required: true,
    minLength: 8,
    maxLength: 8,
    pattern: '^[0-9]{8}$',
  })
  cep_end: string;
}
