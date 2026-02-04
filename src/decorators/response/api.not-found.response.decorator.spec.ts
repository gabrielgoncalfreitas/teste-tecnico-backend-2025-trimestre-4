import { ApiNotFoundResponse } from './api.not-found.response.decorator';
describe('ApiNotFoundResponse', () => {
  const mockModel = class Mock {};
  it('should be defined and return a function', () => {
    const decorator = ApiNotFoundResponse(mockModel);
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });
});
