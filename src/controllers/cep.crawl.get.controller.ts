import type { Response } from 'express';
import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CepCrawlGetHandler } from 'src/handlers/cep.crawl.get.handler';

import { ApiGetResponse } from 'src/decorators/response/api.get.response.decorator';
import { ApiNotFoundResponse } from 'src/decorators/response/api.not-found.response.decorator';
import { CepCrawlGetResponse } from 'src/responses/cep.crawl.get.response';
import { CepCrawlNotFoundResponse } from 'src/responses/cep.crawl.not-found.response';

@ApiTags('CEP Crawl')
@Controller('/cep/crawl')
export class CepCrawlGetController {
  constructor(private readonly handler: CepCrawlGetHandler) {}

  @ApiGetResponse(CepCrawlGetResponse)
  @ApiNotFoundResponse(CepCrawlNotFoundResponse)
  @Get(':crawl_id')
  async main(@Res() res: Response, @Param('crawl_id') crawlId: string) {
    const result = await this.handler.main({ crawl_id: crawlId });

    return res.status(result.code).json(result);
  }
}
