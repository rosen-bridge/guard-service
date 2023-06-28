import GuardPkHandler from '../handlers/GuardPkHandler';

class GuardTurn {
  private static readonly TURNS_LENGTH = 3 * 60; // 3 minutes
  static readonly UP_TIME_LENGTH = 2 * 60; // 2 minutes
  static FULL_PERIOD = (): number =>
    GuardPkHandler.getInstance().guardsLen * this.TURNS_LENGTH;

  /**
   * calculates starting time by getting current time and adding INITIAL_DELAY to it.
   * splits timestamp into guardsLen * TURNS_LENGTH groups. calculates starting group.
   * calculates guard turn starting group by multiplying each TURNS_LENGTH by guard id and adding 1 second for insurance.
   * calculates differ from current group and guard turn starting group.
   * uses reminder in FULL_PERIOD to calculates remaining time to next turn in 1 period.
   * @return seconds to the guard next turn (plus 1 second for insurance)
   */
  static secondsToNextTurn = (): number => {
    const startingTimeStamp = Math.round(Date.now() / 1000);
    const currentTurn = startingTimeStamp % this.FULL_PERIOD();
    const guardTurn = GuardPkHandler.getInstance().guardId * this.TURNS_LENGTH;

    return (
      ((guardTurn - currentTurn + this.FULL_PERIOD()) % this.FULL_PERIOD()) + 1
    ); // (plus 1 second for insurance)
  };

  /**
   * @return remaining seconds to current guard turn
   */
  static secondsToReset = () => {
    const currentTimeStamp = Math.round(Date.now() / 1000);
    const currentPoint = currentTimeStamp % this.TURNS_LENGTH;
    return (
      ((this.UP_TIME_LENGTH - currentPoint + this.TURNS_LENGTH) %
        this.TURNS_LENGTH) +
      1
    ); // (plus 1 second for insurance)
  };

  /**
   * splits timestamp into guardsLen * TURNS_LENGTH groups. calculates current group.
   * splits group into TURNS_LENGTH places.
   *  if current place is passed by UP_TIME_LENGTH, it's in free gap.
   *  if not, splits place into guardsLen stages. stage number shows guards turn.
   * @return which guard should create in current turn (-1 if it's in gap, i.e. last minute of each guard turn)
   */
  static guardTurn = (): number => {
    const currentTimeStamp = Math.round(Date.now() / 1000);
    const currentTurn = currentTimeStamp % this.FULL_PERIOD();

    if (currentTurn % this.TURNS_LENGTH > this.UP_TIME_LENGTH) return -1;
    else
      return (
        Math.floor(currentTurn / this.TURNS_LENGTH) %
        GuardPkHandler.getInstance().guardsLen
      );
  };
}

export default GuardTurn;
