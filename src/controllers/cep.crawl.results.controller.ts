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
  @ApiQuery({ name: 'take', example: 10, required: false, type: Number })
  @ApiQuery({
    name: 'cep_start',
    example: '01001000',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'cep_end',
    example: '01001099',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'status',
    example: 'SUCCESS',
    required: false,
    enum: ['SUCCESS', 'ERROR'],
  })
  @ApiQuery({
    name: 'q',
    example: '',
    required: false,
    type: String,
  })
  async main(
    @Res() res: Response,
    @Param('crawl_id') crawlId: string,
    @Query('page') page: number = 1,
    @Query('take') take: number = 10,
    @Query('cep_start') cep_start?: string,
    @Query('cep_end') cep_end?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    const result = await this.handler.main({
      crawl_id: crawlId,
      page: Number(page),
      take: Number(take),
      cep_start,
      cep_end,
      status,
      q,
    });

    return res.status(result.code).json(result);
  }
}
