import { ApiProperty } from '@nestjs/swagger';

export class CepCrawlGetDTO {
  @ApiProperty({
    example: '019c2a0f-d660-70e0-a082-8443fa76ba3f',
    description: 'ID do Crawl',
  })
  id: string;

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

  @ApiProperty({
    example: 'FINISHED',
    description: 'Status geral da requisição',
    enum: ['PENDING', 'RUNNING', 'FINISHED', 'FAILED'],
  })
  status: string;

  @ApiProperty({
    example: 100,
    description: 'Total de CEPs',
  })
  total: number;

  @ApiProperty({
    example: 50,
    description: 'Quantidade processada',
  })
  processed: number;

  @ApiProperty({
    example: 48,
    description: 'Quantidade de sucessos',
  })
  success: number;

  @ApiProperty({
    example: 2,
    description: 'Quantidade de erros',
  })
  errors: number;
}
