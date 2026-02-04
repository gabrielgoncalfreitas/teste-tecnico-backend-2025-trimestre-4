import { ApiProperty } from '@nestjs/swagger';

export class CepCrawlResultsGetDTO {
  @ApiProperty({
    example: '01001000',
    description: 'CEP',
  })
  cep: string;

  @ApiProperty({
    example: 'Praça da Sé',
    description: 'Logradouro (se disponível)',
    required: false,
  })
  logradouro?: string;

  @ApiProperty({
    example: 'São Paulo',
    description: 'Cidade (se disponível)',
    required: false,
  })
  cidade?: string;

  @ApiProperty({
    example: 'SP',
    description: 'UF (se disponível)',
    required: false,
  })
  uf?: string;

  @ApiProperty({
    example: 'SUCCESS',
    enum: ['SUCCESS', 'ERROR'],
    description: 'Status do processamento deste CEP',
  })
  status: string;

  @ApiProperty({
    example: 'CEP not found',
    description: 'Mensagem de erro (se houver)',
    required: false,
  })
  error?: string;
}
