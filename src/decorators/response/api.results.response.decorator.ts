import {
  getSchemaPath,
  ApiExtraModels,
  ApiOkResponse as ApiOkResponseSwagger,
} from '@nestjs/swagger';
import { HttpStatus, applyDecorators, Type } from '@nestjs/common';
import { HttpResponseMessages } from 'src/constants/http-response-messages.constant';

export function ApiResultsResponse(model: Type<any>) {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponseSwagger({
      description: HttpResponseMessages[HttpStatus.OK].ok.statusEnum,
      schema: {
        $ref: getSchemaPath(model),
      },
    }),
  );
}
