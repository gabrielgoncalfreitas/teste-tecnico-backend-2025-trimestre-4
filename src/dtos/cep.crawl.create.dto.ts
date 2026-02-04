import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, Length } from 'class-validator';
import { IsCepRange } from '../validators/cep-range.validator';

export class CepCrawlCreateDTO {
  @ApiProperty({
    example: '01000000',
    description: 'CEP inicial do range (8 dígitos numéricos)',
  })
  @IsNotEmpty()
  @IsNumberString()
  @Length(8, 8)
  @IsCepRange()
  cep_start: string;

  @ApiProperty({
    example: '01001000',
    description: 'CEP final do range (8 dígitos numéricos)',
  })
  @IsNotEmpty()
  @IsNumberString()
  @Length(8, 8)
  cep_end: string;
}
