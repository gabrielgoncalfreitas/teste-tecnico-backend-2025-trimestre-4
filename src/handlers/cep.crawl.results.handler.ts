import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import { CepCrawlNotFoundResponse } from 'src/responses/cep.crawl.not-found.response';
import { CepCrawlResultsResponse } from 'src/responses/cep.crawl.results.response';
import { CepCrawlResultsGetDTO } from 'src/dtos/cep.crawl.results.get.dto';

@Injectable()
export class CepCrawlResultsHandler {
  constructor(private readonly prisma: PrismaService) {}

  async main({
    crawl_id,
    page = 1,
    limit = 10,
  }: {
    crawl_id: string;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;

    // Check if crawl exists
    const crawl = await this.prisma.crawl.findUnique({
      where: { id: crawl_id },
    });

    if (!crawl) {
      return new CepCrawlNotFoundResponse();
    }

    const [results, total] = await Promise.all([
      this.prisma.crawl_result.findMany({
        where: { crawl_id },
        skip,
        take: limit,
        orderBy: { created_at: 'asc' },
      }),
      this.prisma.crawl_result.count({
        where: { crawl_id },
      }),
    ]);

    const dtos: CepCrawlResultsGetDTO[] = results.map((r) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = r.data as any;
      return {
        cep: r.cep,
        status: r.status,
        error: r.error_message ?? undefined,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        logradouro: data?.logradouro,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        cidade: data?.localidade,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        uf: data?.uf,
      };
    });

    return new CepCrawlResultsResponse(dtos, page, limit, total);
  }
}
