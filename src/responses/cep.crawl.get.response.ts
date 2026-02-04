import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Response } from 'src/interfaces/response.interface';
import { CepCrawlGetDTO } from 'src/dtos/cep.crawl.get.dto';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

const res = HttpResponseMessages[HttpStatus.OK].ok;

export class CepCrawlGetResponse implements Response<CepCrawlGetDTO> {
  @ApiProperty({ example: res.statusCode })
  code: number = res.statusCode;

  @ApiProperty({ example: res.statusEnum })
  enum: string = res.statusEnum;

  @ApiProperty({ example: res.message })
  message: string = res.message;

  @ApiProperty({ example: res.isError })
  isError: boolean = res.isError;

  @ApiProperty({ type: CepCrawlGetDTO })
  data: CepCrawlGetDTO;

  constructor(data: CepCrawlGetDTO) {
    this.data = data;
  }
}
