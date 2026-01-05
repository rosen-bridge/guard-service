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

class NotEnoughValidBoxesError extends Error {
  constructor(msg: string) {
    super('NotEnoughValidBoxesError: ' + msg);
  }
}

class ImpossibleBehavior extends Error {
  constructor(msg: string) {
    super('ImpossibleBehavior: ' + msg);
  }
}

class ValueError extends Error {
  constructor(msg: string) {
    super('ValueError: ' + msg);
  }
}

class MaxParallelTxError extends Error {
  constructor(msg: string) {
    super('MaxParallelTxError: ' + msg);
  }
}
class SerializationError extends Error {
  constructor(msg: string) {
    super('SerializationError: ' + msg);
  }
}
class DeserializationError extends Error {
  constructor(msg: string) {
    super('DeserializationError: ' + msg);
  }
}
class AssetNotSupportedError extends Error {
  constructor(msg: string) {
    super('AssetNotSupportedError: ' + msg);
  }
}
class TransactionFormatError extends Error {
  constructor(msg: string) {
    super('TransactionFormatError: ' + msg);
  }
}

export {
  FailedError,
  ImpossibleBehavior,
  NetworkError,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  NotFoundError,
  UnexpectedApiError,
  ValueError,
  MaxParallelTxError,
  SerializationError,
  DeserializationError,
  AssetNotSupportedError,
  TransactionFormatError,
};
