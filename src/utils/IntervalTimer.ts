class IntervalTimer {
  intervalMs: number;
  callback: () => Promise<void>;
  checkIntervalMs: number;

  callbackRunning: boolean;
  lastRun: number;

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
    checkIntervalMs = 1000
  ) {
    this.intervalMs = intervalMs;
    this.callback = callback;
    this.checkIntervalMs = checkIntervalMs;

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
          'IntervalTimer callback error occured. this should be unreachable, handle errors in the job itself.'
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
