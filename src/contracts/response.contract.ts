export interface Response<T> {
  code: number;
  enum: string;
  message: string;
  isError: boolean;
  data: T;
}
