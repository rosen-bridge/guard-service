import Configs from "./Configs";

class Utils {

    private static readonly guardsLen = Configs.guardsLen
    private static readonly guardId = Configs.guardId
    private static readonly INITIAL_DELAY = 5 * 60 // 5 minutes
    private static readonly TURNS_LENGTH = 3 * 60 // 3 minutes
    private static readonly UP_TIME_LENGTH = 2 * 60 // 2 minutes
    private static readonly FULL_PERIOD = this.guardsLen * this.TURNS_LENGTH

    /**
     * calculates starting time by getting current time and adding INITIAL_DELAY to it.
     * splits time zone into guardsLen * TURNS_LENGTH zones. calculates starting zone.
     * calculates guard turn starting zone by multiplying each TURNS_LENGTH by guard id and adding 1 second for insurance.
     * calculates differ from current zone and guard turn starting zone.
     * uses reminder in FULL_PERIOD to calculates remaining time to next turn in 1 period (uses double reminder to prevent negative number).
     * @return seconds to the guard next turn (plus 1 second for insurance)
     */
    static secondsToNextTurn = (): number => {
        const startingTimeStamp = Date.now() + this.INITIAL_DELAY
        const currentTurn = startingTimeStamp % (this.guardsLen * this.TURNS_LENGTH)
        const guardTurn = this.guardId * this.TURNS_LENGTH + 1 // (plus 1 second for insurance)

        return ((guardTurn - currentTurn) % this.FULL_PERIOD + this.FULL_PERIOD) % this.FULL_PERIOD
    }

    /**
     * splits time zone into guardsLen * TURNS_LENGTH zones. calculates current zone.
     * splits zone into TURNS_LENGTH places.
     *  if current place is passed by UP_TIME_LENGTH, it's in free gap.
     *  if not, splits place into guardsLen stages. stage number shows guards turn.
     * @return which guard should create in current turn (-1 if it's in gap, i.e. last minute of each guard turn)
     */
    static guardTurn = (): number => {
        const currentTimeStamp = Date.now()
        const currentTurn = currentTimeStamp % (this.guardsLen * this.TURNS_LENGTH)

        if (currentTurn % this.TURNS_LENGTH > this.UP_TIME_LENGTH) return -1
        else return (currentTurn / this.guardsLen)
    }

    /**
     * converts number to 1 byte Uint8Array
     * @param num
     */
    static numberToByte = (num: number): Uint8Array => {
        const buffer = Buffer.alloc(1, 0)
        buffer.writeUint8(num)
        return buffer
    }

}

export default Utils
