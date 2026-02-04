import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Response } from 'src/interfaces/response.interface';
import { CepCrawlResultsGetDTO } from 'src/dtos/cep.crawl.results.get.dto';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

const res = HttpResponseMessages[HttpStatus.OK].ok;

export interface CepCrawlResultsFilters {
  cep_start?: string;
  cep_end?: string;
  status?: string;
  q?: string;
}

export class CepCrawlResultsResponse implements Response<
  CepCrawlResultsGetDTO[]
> {
  @ApiProperty({ example: res.statusCode })
  code: number = res.statusCode;

  @ApiProperty({ example: res.statusEnum })
  enum: string = res.statusEnum;

  @ApiProperty({ example: res.message })
  message: string = res.message;

  @ApiProperty({ example: res.isError })
  isError: boolean = res.isError;

  @ApiProperty({ type: [CepCrawlResultsGetDTO] })
  data: CepCrawlResultsGetDTO[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  take: number;

  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ required: false, example: '01001000' })
  cep_start?: string;

  @ApiProperty({ required: false, example: '01001099' })
  cep_end?: string;

  @ApiProperty({ required: false, example: 'SUCCESS' })
  status?: string;

  @ApiProperty({ required: false, example: 'Praça da Sé' })
  q?: string;

  constructor(
    page: number,
    take: number,
    total: number,
    data: CepCrawlResultsGetDTO[],
    filters?: CepCrawlResultsFilters,
  ) {
    this.page = page;
    this.take = take;
    this.total = total;
    this.cep_start = filters?.cep_start;
    this.cep_end = filters?.cep_end;
    this.status = filters?.status;
    this.q = filters?.q;
    this.data = data;
  }
}
