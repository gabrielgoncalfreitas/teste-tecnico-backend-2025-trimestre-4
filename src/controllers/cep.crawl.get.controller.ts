import type { Response } from 'express';
import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CepCrawlGetHandler } from 'src/handlers/cep.crawl.get.handler';

@ApiTags('CEP Crawl')
@Controller('/cep/crawl')
export class CepCrawlGetController {
  constructor(private readonly handler: CepCrawlGetHandler) {}

  @Get(':crawl_id')
  async main(@Res() res: Response, @Param('crawl_id') crawlId: string) {
    const result = await this.handler.main({ crawl_id: crawlId });

    return res.status(result.code).json(result);
  }
}
