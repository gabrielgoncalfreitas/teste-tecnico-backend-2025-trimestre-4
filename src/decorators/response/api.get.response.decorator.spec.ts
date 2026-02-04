import { ApiGetResponse } from './api.get.response.decorator';
describe('ApiGetResponse', () => {
  const mockModel = class Mock {};
  it('should be defined and return a function', () => {
    const decorator = ApiGetResponse(mockModel);
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });
});
