import { HttpStatus } from '@nestjs/common';
import { Response } from 'src/contracts/response.contract';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

const res = HttpResponseMessages[HttpStatus.NOT_FOUND].not_found;

export class CepCrawlNotFoundResponse implements Response<null> {
  @ApiProperty({ example: res.statusCode })
  code: number = res.statusCode;

  @ApiProperty({ example: res.statusEnum })
  enum: string = res.statusEnum;

  @ApiProperty({ example: res.message })
  message: string = res.message;

  @ApiProperty({ example: res.isError })
  isError: boolean = res.isError;

  @ApiHideProperty()
  data: null;
}
