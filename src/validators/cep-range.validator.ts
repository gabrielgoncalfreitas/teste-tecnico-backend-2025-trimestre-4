import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsCepRangeConstraint implements ValidatorConstraintInterface {
  validate(cepStart: any, args: ValidationArguments) {
    const object = args.object as { cep_end: string };
    const cepEnd = object.cep_end;

    if (!cepStart || !cepEnd) return false;

    const start = parseInt(cepStart as string, 10);
    const end = parseInt(cepEnd, 10);

    if (isNaN(start) || isNaN(end)) return false;
    if (start > end) return false;
    if (end - start > 10000) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as { cep_start: string; cep_end: string };
    const start = parseInt(object.cep_start, 10);
    const end = parseInt(object.cep_end, 10);

    if (start > end) return 'cep_start must be less than or equal to cep_end';
    if (end - start > 10000) return 'Range too large (max 10000)';
    return 'Invalid CEP range';
  }
}

export function IsCepRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCepRangeConstraint,
    });
  };
}
