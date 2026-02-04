import {
  getSchemaPath,
  ApiExtraModels,
  ApiNotFoundResponse as ApiNotFoundResponseSwagger,
} from '@nestjs/swagger';
import { HttpStatus, applyDecorators, Type } from '@nestjs/common';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

export function ApiNotFoundResponse(model: Type<any>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiNotFoundResponseSwagger({
      description:
        HttpResponseMessages[HttpStatus.NOT_FOUND].not_found.statusEnum,
      schema: {
        $ref: getSchemaPath(model),
      },
    }),
  );
}
