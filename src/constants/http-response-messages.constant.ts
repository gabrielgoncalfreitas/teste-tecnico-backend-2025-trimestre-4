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
  [HttpStatus.ACCEPTED]: {
    accepted: {
      statusCode: HttpStatus.ACCEPTED,
      statusEnum: 'ACCEPTED',
      message: 'Aceito',
      isError: false,
    },
  },
  [HttpStatus.NOT_FOUND]: {
    not_found: {
      statusCode: HttpStatus.NOT_FOUND,
      statusEnum: 'NOT_FOUND',
      message: 'Não encontrado',
      isError: true,
    },
  },
};
