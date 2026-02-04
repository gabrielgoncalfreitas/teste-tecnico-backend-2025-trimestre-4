import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class CepCrawlCreateDTO {
  @ApiProperty({
    example: '01000000',
    description: 'CEP de início',
    required: true,
    minLength: 8,
    maxLength: 8,
    pattern: '^[0-9]{8}$',
  })
  @IsString()
  @Length(8, 8)
  @Matches(/^[0-9]{8}$/, {
    message: 'CEP deve conter apenas 8 dígitos numéricos',
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
  @IsString()
  @Length(8, 8)
  @Matches(/^[0-9]{8}$/, {
    message: 'CEP deve conter apenas 8 dígitos numéricos',
  })
  cep_end: string;
}
