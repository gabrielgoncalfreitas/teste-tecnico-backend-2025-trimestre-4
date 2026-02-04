import { HttpResponseMessages } from './http-response-messages.constant';
import { HttpStatus } from '@nestjs/common';

describe('HttpResponseMessages', () => {
  it('should have OK message', () => {
    expect(HttpResponseMessages[HttpStatus.OK].ok.statusEnum).toBe('OK');
  });

  it('should have NOT_FOUND message', () => {
    expect(
      HttpResponseMessages[HttpStatus.NOT_FOUND].not_found.statusEnum,
    ).toBe('NOT_FOUND');
  });

  it('should have BAD_REQUEST message', () => {
    expect(
      HttpResponseMessages[HttpStatus.BAD_REQUEST].bad_request.statusEnum,
    ).toBe('BAD_REQUEST');
  });
});
