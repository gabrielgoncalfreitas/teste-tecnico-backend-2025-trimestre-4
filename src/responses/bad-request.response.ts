import { HttpStatus } from '@nestjs/common';
import { Response } from 'src/interfaces/response.interface';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

const res = HttpResponseMessages[HttpStatus.BAD_REQUEST].bad_request;

export class BadRequestResponse implements Response<null> {
  @ApiProperty({ example: res.statusCode })
  code: number = res.statusCode;

  @ApiProperty({ example: res.statusEnum })
  enum: string = res.statusEnum;

  @ApiProperty({ example: res.message })
  message: string;

  @ApiProperty({ example: res.isError })
  isError: boolean = res.isError;

  @ApiHideProperty()
  data: null = null;

  constructor(message?: string) {
    this.message = message || res.message;
  }
}
