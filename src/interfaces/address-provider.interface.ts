import { AddressData } from './address.interface';

export interface AddressProvider {
  getName(): string;
  getAddress(cep: string): Promise<AddressData | null>;
}
