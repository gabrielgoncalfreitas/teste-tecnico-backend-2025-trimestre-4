import { AddressData } from '../../contracts/address.contract';

export interface AddressProvider {
  getName(): string;
  getAddress(cep: string): Promise<AddressData | null>;
}
