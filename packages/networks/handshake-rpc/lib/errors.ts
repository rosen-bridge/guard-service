import { FailedError } from '@rosen-chains/abstract-chain';

/**
 * a failed JSON-RPC call
 *
 * hsd answers a failed call with HTTP 200 and an `error` object in the body, so
 * the failure never rejects the underlying request and has to be raised here
 */
export class HandshakeRpcError extends FailedError {
  readonly code: number;

  constructor(code: number, msg: string) {
    super(msg);
    this.code = code;
  }
}
