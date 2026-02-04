import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { CepCrawlResultsHandler } from 'src/handlers/cep.crawl.results.handler';
import { CepCrawlNotFoundResponse } from 'src/responses/cep.crawl.not-found.response';
import { ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('CEP Crawl')
@Controller('/cep/crawl')
export class CepCrawlResultsController {
  constructor(private readonly handler: CepCrawlResultsHandler) {}

  @Get(':crawl_id/results')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async main(
    @Param('crawl_id') crawlId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.handler.main({
      crawl_id: crawlId,
      page: Number(page),
      limit: Number(limit),
    });

    if (result instanceof CepCrawlNotFoundResponse) {
      throw new NotFoundException(result);
    }

    return result;
  }
}
