import { CepCrawlGetResponse } from './cep.crawl.get.response';

describe('CepCrawlGetResponse', () => {
  it('should map properties correctly', () => {
    const data = {
      id: '1',
      status: 'FINISHED' as any,
      total: 1,
      processed: 1,
      success: 1,
      errors: 0,
      cep_start: '01001000',
      cep_end: '01001000',
    };
    const response = new CepCrawlGetResponse(data);
    expect(response.data.id).toBe(data.id);
    expect(response.data.status).toBe(data.status);
  });
});
