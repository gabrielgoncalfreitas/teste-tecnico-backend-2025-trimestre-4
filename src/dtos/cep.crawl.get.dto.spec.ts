import { CepCrawlGetDTO } from './cep.crawl.get.dto';
describe('CepCrawlGetDTO', () => {
  it('should hold crawl_id', () => {
    const dto = new CepCrawlGetDTO();
    dto.crawl_id = 'test-id';
    expect(dto.crawl_id).toBe('test-id');
  });
});
