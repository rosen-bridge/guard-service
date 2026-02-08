class IntervalTimer {
  intervalMs: number;
  callback: () => Promise<void>;
  checkIntervalMs: number;

  callbackRunning: boolean;
  lastRun: number;

  // eslint-disable-next-line no-undef
  timer: NodeJS.Timeout | undefined;

  /**
   * IntervalTimer manages periodic execution of an asynchronous callback by the given
   * interval and check interval
   * @param intervalMs
   * @param callback
   * @param checkIntervalMs
   */
  constructor(
    intervalMs: number,
    callback: () => Promise<void>,
    checkIntervalMs?: number,
  ) {
    this.intervalMs = intervalMs;
    this.callback = callback;
    this.checkIntervalMs = checkIntervalMs ?? intervalMs;

    this.callbackRunning = false;
    this.lastRun = 0;
  }

  /**
   * creates a new timer to run the callback on intervals
   * @returns promise of void
   */
  start = async () => {
    if (this.timer) return;

    await this.runLoop();

    this.timer = setInterval(async () => {
      this.runLoop();
    }, this.checkIntervalMs);
  };

  /**
   * runs the main check time loop
   * @returns promise of void
   */
  runLoop = async () => {
    const now = Date.now();

    if (
      now >= this.lastRun + this.intervalMs &&
      this.callbackRunning === false
    ) {
      this.callbackRunning = true;
      this.lastRun = now;

      try {
        await this.callback();
      } catch (error) {
        throw new Error(
          `An error occurred in IntervalTimer callback (THIS SHOULD BE UNREACHABLE! please handle errors in the callback itself): ${error}`,
        );
      }

      this.callbackRunning = false;
    }
  };

  /**
   * stops the timer
   * @returns void
   */
  stop = () => {
    clearInterval(this.timer);
    this.timer = undefined;
  };
}

export default IntervalTimer;
