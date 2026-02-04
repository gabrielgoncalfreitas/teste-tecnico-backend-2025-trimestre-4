import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CepCrawlGetHandler } from 'src/handlers/cep.crawl.get.handler';
import { CepCrawlNotFoundResponse } from 'src/responses/cep.crawl.not-found.response';

@ApiTags('CEP Crawl')
@Controller('/cep/crawl')
export class CepCrawlGetController {
  constructor(private readonly handler: CepCrawlGetHandler) {}

  @Get(':crawl_id')
  async main(@Param('crawl_id') crawlId: string) {
    const result = await this.handler.main({ crawl_id: crawlId });

    if (result instanceof CepCrawlNotFoundResponse) {
      throw new NotFoundException(result);
    }

    return result;
  }
}
