class FailedError extends Error {
  constructor(msg: string) {
    super('FailedError: ' + msg);
  }
}

class NotFoundError extends Error {
  constructor(msg: string) {
    super('NotFoundError: ' + msg);
  }
}

class NetworkError extends Error {
  constructor(msg: string) {
    super('NetworkError: ' + msg);
  }
}

class UnexpectedApiError extends Error {
  constructor(msg: string) {
    super('UnexpectedApiError: ' + msg);
  }
}

class NotEnoughAssetsError extends Error {
  constructor(msg: string) {
    super('NotEnoughAssetsError: ' + msg);
  }
}

class ChainNotImplemented extends Error {
  constructor(chain: string) {
    super(chain + 'ChainNotImplemented');
  }
}

export {
  FailedError,
  NotFoundError,
  NetworkError,
  UnexpectedApiError,
  NotEnoughAssetsError,
  ChainNotImplemented,
};
