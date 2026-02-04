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
    const object = args.object as any;
    const cepEnd = object.cep_end;

    if (!cepStart || !cepEnd) return false; // Basic decorators handle existence

    const start = parseInt(cepStart);
    const end = parseInt(cepEnd);

    if (isNaN(start) || isNaN(end)) return false; // Should be handled by @IsNumberString
    if (start > end) return false;
    if (end - start > 10000) return false;

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    const object = args.object as any;
    const start = parseInt(object.cep_start);
    const end = parseInt(object.cep_end);

    if (start > end) return 'cep_start must be less than or equal to cep_end';
    if (end - start > 10000) return 'Range too large (max 10000)';
    return 'Invalid CEP range';
  }
}

export function IsCepRange(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCepRangeConstraint,
    });
  };
}
