import { CepCrawlResultsResponse } from './cep.crawl.results.response';
describe('CepCrawlResultsResponse', () => {
  it('should map results and pagination correctly', () => {
    const results = [{ cep: '01001000', status: 'SUCCESS' as any }];
    const response = new CepCrawlResultsResponse(results, 1, 10, 100);
    expect(response.data).toEqual(results);
    expect(response.total).toBe(100);
    expect(response.page).toBe(1);
  });
});
