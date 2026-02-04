import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { CepCrawlCreateDTO } from 'src/dtos/cep.crawl.create.dto';
import { CepCrawlCreateHandler } from 'src/handlers/cep.crawl.create.handler';
import { ApiCreateResponse } from 'src/decorators/response/api.create.response.decorator';

@ApiTags('CEP Crawl')
@Controller('/cep/crawl')
export class CepCrawlCreateController {
  constructor(private readonly handler: CepCrawlCreateHandler) {}

  @ApiCreateResponse(CepCrawlCreateDTO)
  @Post()
  async main(@Res() res: Response, @Body() body: CepCrawlCreateDTO) {
    const result = await this.handler.main({ body });

    return res.status(result.code).json(result);
  }
}
