import { CepCrawlCreateDTO } from './cep.crawl.create.dto';
describe('CepCrawlCreateDTO', () => {
  it('should hold input properties', () => {
    const dto = new CepCrawlCreateDTO();
    dto.cep_start = '01000000';
    dto.cep_end = '01001000';
    expect(dto.cep_start).toBe('01000000');
    expect(dto.cep_end).toBe('01001000');
  });
});
