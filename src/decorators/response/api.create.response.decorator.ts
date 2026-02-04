import {
  getSchemaPath,
  ApiExtraModels,
  ApiCreatedResponse as ApiCreatedResponseSwagger,
} from '@nestjs/swagger';
import { HttpStatus, applyDecorators } from '@nestjs/common';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function ApiCreateResponse(model: Function) {
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
