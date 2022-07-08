import Configs from "./Configs";

class Utils {

    private static readonly guardsLen = Configs.guardsLen
    private static readonly guardId = Configs.guardId
    private static readonly INITIAL_DELAY = 5 * 60 // 5 minutes
    private static readonly TURNS_LENGTH = 3 * 60 // 3 minutes
    private static readonly UP_TIME_LENGTH = 2 * 60 // 2 minutes
    private static readonly FULL_PERIOD = this.guardsLen * this.TURNS_LENGTH

    /**
     * @return seconds to the guard next turn (plus 1 second for insurance)
     */
    static secondsToNextTurn = (): number => {
        const startingTimeStamp = Date.now() + this.INITIAL_DELAY
        const currentTurn = startingTimeStamp % (this.guardsLen * this.TURNS_LENGTH)
        const guardTurn = this.guardId * this.TURNS_LENGTH + 1 // (plus 1 second for insurance)

        return ((guardTurn - currentTurn) % this.FULL_PERIOD + this.FULL_PERIOD) % this.FULL_PERIOD
    }

    /**
     * @return which guard should create in current turn (-1 if it's in gap, i.e. last minute of each guard turn)
     */
    static guardTurn = (): number => {
        const currentTimeStamp = Date.now()
        const currentTurn = currentTimeStamp % (this.guardsLen * this.TURNS_LENGTH)

        if (currentTurn % this.TURNS_LENGTH > this.UP_TIME_LENGTH) return -1
        else return (currentTurn / this.guardsLen)
    }

}

export default Utils
