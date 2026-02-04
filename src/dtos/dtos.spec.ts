import { CepCrawlCreateDTO } from './cep.crawl.create.dto';
import { CepCrawlGetDTO } from './cep.crawl.get.dto';
import { CepCrawlResultsGetDTO } from './cep.crawl.results.get.dto';
describe('DTOs', () => {
  it('CepCrawlCreateDTO should hold values', () => {
    const dto = new CepCrawlCreateDTO();
    dto.cep_start = '01000000';
    dto.cep_end = '01001000';
    expect(dto.cep_start).toBe('01000000');
  });
  it('CepCrawlGetDTO should hold values', () => {
    const dto = new CepCrawlGetDTO();
    dto.crawl_id = 'test-id';
    expect(dto.crawl_id).toBe('test-id');
  });
  it('CepCrawlResultsGetDTO should hold values', () => {
    const dto = new CepCrawlResultsGetDTO();
    dto.cep = '01001000';
    dto.status = 'SUCCESS' as any;
    expect(dto.cep).toBe('01001000');
  });
});
