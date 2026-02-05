export class ThrottlingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThrottlingError';
  }
}
