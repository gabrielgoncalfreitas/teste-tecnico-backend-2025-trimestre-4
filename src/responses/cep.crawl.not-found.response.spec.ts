import { CepCrawlNotFoundResponse } from './cep.crawl.not-found.response';
describe('CepCrawlNotFoundResponse', () => {
  it('should have code 404', () => {
    const response = new CepCrawlNotFoundResponse();
    expect(response.code).toBe(404);
    expect(response.isError).toBe(true);
  });
});
