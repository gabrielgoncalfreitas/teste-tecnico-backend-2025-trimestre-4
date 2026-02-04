import { ApiCreateResponse } from './api.create.response.decorator';
describe('ApiCreateResponse', () => {
  const mockModel = class Mock {};
  it('should be defined and return a function', () => {
    const decorator = ApiCreateResponse(mockModel);
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe('function');
  });
});
