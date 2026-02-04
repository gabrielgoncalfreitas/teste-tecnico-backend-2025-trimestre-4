import { CepCrawlResultsGetDTO } from './cep.crawl.results.get.dto';
describe('CepCrawlResultsGetDTO', () => {
  it('should hold query properties', () => {
    const dto = new CepCrawlResultsGetDTO();
    dto.cep = '01001000';
    dto.status = 'SUCCESS' as any;
    expect(dto.cep).toBe('01001000');
    expect(dto.status).toBe('SUCCESS');
  });
});
