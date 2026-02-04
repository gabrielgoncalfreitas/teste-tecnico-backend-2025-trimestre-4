import { BadRequestResponse } from './bad-request.response';

describe('BadRequestResponse', () => {
  it('should initialize with default message', () => {
    const response = new BadRequestResponse();
    expect(response.code).toBe(400);
    expect(response.isError).toBe(true);
    expect(response.message).toBeDefined();
  });

  it('should initialize with custom message', () => {
    const msg = 'Custom error';
    const response = new BadRequestResponse(msg);
    expect(response.message).toBe(msg);
  });
});
