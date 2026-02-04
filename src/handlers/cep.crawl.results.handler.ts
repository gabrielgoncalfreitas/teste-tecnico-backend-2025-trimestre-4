import { Injectable } from '@nestjs/common';
import { CrawlService } from 'src/services/crawl.service';
import { CepCrawlNotFoundResponse } from 'src/responses/cep.crawl.not-found.response';
import { CepCrawlResultsResponse } from 'src/responses/cep.crawl.results.response';
import { CepCrawlResultsGetDTO } from 'src/dtos/cep.crawl.results.get.dto';
import { AddressData } from 'src/interfaces/address.interface';

@Injectable()
export class CepCrawlResultsHandler {
  constructor(private readonly crawlService: CrawlService) {}

  async main({
    crawl_id,
    page = 1,
    take = 10,
  }: {
    crawl_id: string;
    page?: number;
    take?: number;
  }) {
    const skip = (page - 1) * take;

    const crawl = await this.crawlService.findById(crawl_id);

    if (!crawl) {
      return new CepCrawlNotFoundResponse();
    }

    const [results, total] = await Promise.all([
      this.crawlService.findResults(crawl_id, skip, take),
      this.crawlService.countResults(crawl_id),
    ]);

    const dtos: CepCrawlResultsGetDTO[] = results.map((r) => {
      const data = r.data as AddressData | null;
      return {
        cep: r.cep,
        status: r.status,
        error: r.error_message ?? undefined,
        logradouro: data?.logradouro,
        cidade: data?.localidade,
        uf: data?.uf,
      };
    });

    return new CepCrawlResultsResponse(page, take, total, dtos);
  }
}
