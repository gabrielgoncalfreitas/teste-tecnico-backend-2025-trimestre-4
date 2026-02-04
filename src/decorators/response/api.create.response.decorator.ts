import {
  getSchemaPath,
  ApiExtraModels,
  ApiCreatedResponse as ApiCreatedResponseSwagger,
} from '@nestjs/swagger';
import { HttpStatus, applyDecorators, Type } from '@nestjs/common';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

export function ApiCreateResponse(model: Type<any>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiCreatedResponseSwagger({
      description: HttpResponseMessages[HttpStatus.CREATED].created.statusEnum,
      schema: {
        $ref: getSchemaPath(model),
      },
    }),
  );
}
