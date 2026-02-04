import { HealthResponse } from './health.response';
describe('HealthResponse', () => {
  it('should hold status and timestamp', () => {
    const response = new HealthResponse();
    response.status = 'OK';
    response.timestamp = '2026-02-04T13:31:06.000Z';
    expect(response.status).toBe('OK');
    expect(response.timestamp).toBe('2026-02-04T13:31:06.000Z');
  });
});
