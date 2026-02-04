import type { Response } from 'express';
import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { CepCrawlResultsHandler } from 'src/handlers/cep.crawl.results.handler';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

import { ApiResultsResponse } from 'src/decorators/response/api.results.response.decorator';
import { ApiNotFoundResponse } from 'src/decorators/response/api.not-found.response.decorator';
import { CepCrawlResultsResponse } from 'src/responses/cep.crawl.results.response';
import { CepCrawlNotFoundResponse } from 'src/responses/cep.crawl.not-found.response';

@ApiTags('CEP Crawl')
@Controller('/cep/crawl')
export class CepCrawlResultsController {
  constructor(private readonly handler: CepCrawlResultsHandler) {}

  @ApiResultsResponse(CepCrawlResultsResponse)
  @ApiNotFoundResponse(CepCrawlNotFoundResponse)
  @Get(':crawl_id/results')
  @ApiQuery({ name: 'page', example: 1, required: false, type: Number })
  @ApiQuery({ name: 'limit', example: 10, required: false, type: Number })
  async main(
    @Res() res: Response,
    @Param('crawl_id') crawlId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.handler.main({
      crawl_id: crawlId,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(result.code).json(result);
  }
}
