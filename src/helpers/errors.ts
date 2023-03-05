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

class ChainNotImplemented extends Error {
  constructor(chain: string) {
    super(chain + 'ChainNotImplemented');
  }
}

class ImpossibleBehavior extends Error {
  constructor(msg: string) {
    super('ImpossibleBehavior: ' + msg);
  }
}

class ConfigError extends Error {
  constructor(configPath: string, actualValue: any) {
    super(
      `unexpected config at path ${configPath}: ${JSON.stringify(actualValue)}`
    );
  }
}

class NotStartedDialerNodeError extends Error {
  constructor() {
    super("Dialer node isn't ready, please try later");
  }
}

class CommitmentMisMatch extends Error {
  constructor(msg: string) {
    super('CommitmentMismatch: ' + msg);
  }
}

export {
  ChainNotImplemented,
  ConfigError,
  FailedError,
  ImpossibleBehavior,
  NetworkError,
  NotEnoughAssetsError,
  NotEnoughValidBoxesError,
  NotFoundError,
  NotStartedDialerNodeError,
  UnexpectedApiError,
  CommitmentMisMatch,
};
