import { CepCrawlCreateResponse } from './cep.crawl.create.response';

describe('CepCrawlCreateResponse', () => {
  it('should map properties correctly', () => {
    const data = {
      id: '1',
      status: 'RUNNING' as any,
      total: 10,
      processed: 5,
      success: 4,
      errors: 1,
      cep_start: '01000000',
      cep_end: '01000009',
    };
    const response = new CepCrawlCreateResponse(data);
    expect(response.data.id).toBe(data.id);
    expect(response.data.status).toBe(data.status);
    expect(response.data.total).toBe(data.total);
  });
});
