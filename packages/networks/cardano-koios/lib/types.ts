import { UnexpectedApiError } from '@rosen-chains/abstract-chain';

class KoiosNullValueError extends UnexpectedApiError {
  constructor(msg: string) {
    super('KoiosNullValueError: ' + msg);
  }
}

export { KoiosNullValueError };
