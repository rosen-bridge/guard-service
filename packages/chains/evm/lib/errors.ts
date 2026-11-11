class MaxActiveNonceExceededError extends Error {
  constructor(msg: string) {
    super('MaxActiveNonceExceededError: ' + msg);
  }
}

export { MaxActiveNonceExceededError };
