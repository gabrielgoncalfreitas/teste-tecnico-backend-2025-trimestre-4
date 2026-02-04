import { ApiCreateResponse } from './api.create.response.decorator';
import { ApiGetResponse } from './api.get.response.decorator';
import { ApiNotFoundResponse } from './api.not-found.response.decorator';
import { ApiResultsResponse } from './api.results.response.decorator';

describe('Response Decorators', () => {
  const mockModel = class Mock {};

  it('ApiCreateResponse should be a function', () => {
    expect(typeof ApiCreateResponse).toBe('function');
    const decorator = ApiCreateResponse(mockModel);
    expect(decorator).toBeDefined();
  });

  it('ApiGetResponse should be a function', () => {
    expect(typeof ApiGetResponse).toBe('function');
    const decorator = ApiGetResponse(mockModel);
    expect(decorator).toBeDefined();
  });

  it('ApiNotFoundResponse should be a function', () => {
    expect(typeof ApiNotFoundResponse).toBe('function');
    const decorator = ApiNotFoundResponse(mockModel);
    expect(decorator).toBeDefined();
  });

  it('ApiResultsResponse should be a function', () => {
    expect(typeof ApiResultsResponse).toBe('function');
    const decorator = ApiResultsResponse(mockModel);
    expect(decorator).toBeDefined();
  });
});
