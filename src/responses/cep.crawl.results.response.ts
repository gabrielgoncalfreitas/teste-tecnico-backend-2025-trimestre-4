import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Response } from 'src/interfaces/response.interface';
import { CepCrawlResultsGetDTO } from 'src/dtos/cep.crawl.results.get.dto';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

const res = HttpResponseMessages[HttpStatus.OK].ok;

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

  constructor(
    page: number,
    take: number,
    total: number,
    data: CepCrawlResultsGetDTO[],
  ) {
    this.page = page;
    this.take = take;
    this.total = total;
    this.data = data;
  }
}
