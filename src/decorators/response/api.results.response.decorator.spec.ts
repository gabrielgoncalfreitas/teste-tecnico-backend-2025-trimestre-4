import { ApiResultsResponse } from './api.results.response.decorator';
describe('ApiResultsResponse', () => {
  const mockModel = class Mock {};
  it('should be defined and return a function', () => {
    const decorator = ApiResultsResponse(mockModel);
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });
});
