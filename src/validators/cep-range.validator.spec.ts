import { IsCepRangeConstraint } from './cep-range.validator';

describe('IsCepRangeConstraint', () => {
  let constraint: IsCepRangeConstraint;

  beforeEach(() => {
    constraint = new IsCepRangeConstraint();
  });

  it('should return true for valid range', () => {
    const args: any = { object: { cep_end: '01000005' } };
    expect(constraint.validate('01000000', args)).toBe(true);
  });

  it('should return false if cep_start > cep_end', () => {
    const args: any = { object: { cep_end: '01000000' } };
    expect(constraint.validate('01000005', args)).toBe(false);
    expect(
      constraint.defaultMessage({
        object: { cep_start: '01000005', cep_end: '01000000' },
      } as any),
    ).toBe('cep_start must be less than or equal to cep_end');
  });

  it('should return false if range > 10000', () => {
    const args: any = { object: { cep_end: '01010001' } };
    expect(constraint.validate('01000000', args)).toBe(false);
    expect(
      constraint.defaultMessage({
        object: { cep_start: '01000000', cep_end: '01010001' },
      } as any),
    ).toBe('Range too large (max 10000)');
  });

  it('should return false if invalid format', () => {
    const args: any = { object: { cep_end: 'abc' } };
    expect(constraint.validate('01000000', args)).toBe(false);
  });
});
