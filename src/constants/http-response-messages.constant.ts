import { HttpStatus } from '@nestjs/common';

export const HttpResponseMessages = {
  [HttpStatus.OK]: {
    ok: {
      statusCode: HttpStatus.OK,
      statusEnum: 'OK',
      message: 'Ok',
      isError: false,
    },
  },
  [HttpStatus.CREATED]: {
    created: {
      statusCode: HttpStatus.CREATED,
      statusEnum: 'CREATED',
      message: 'Criado',
      isError: false,
    },
  },
};
