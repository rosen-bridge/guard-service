export class ConfigError extends Error {
  constructor(configPath: string, actualValue: any) {
    super(
      `unexpected config at path ${configPath}: ${JSON.stringify(actualValue)}`
    );
  }
}

export class NotStartedDialerNodeError extends Error {
  constructor() {
    super("Dialer node isn't ready, please try later");
  }
}

export class CommitmentMisMatch extends Error {
  constructor(msg: string) {
    super('CommitmentMismatch: ' + msg);
  }
}
