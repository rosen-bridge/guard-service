import { Buffer } from "buffer";
import Encryption from "./Encryption";
import { guardConfig } from "./GuardConfig";

class Utils {

    private static readonly TURNS_LENGTH = 3 * 60 // 3 minutes
    static readonly UP_TIME_LENGTH = 2 * 60 // 2 minutes
    static FULL_PERIOD = (): number => guardConfig.guardsLen * this.TURNS_LENGTH

    /**
     * calculates starting time by getting current time and adding INITIAL_DELAY to it.
     * splits timestamp into guardsLen * TURNS_LENGTH groups. calculates starting group.
     * calculates guard turn starting group by multiplying each TURNS_LENGTH by guard id and adding 1 second for insurance.
     * calculates differ from current group and guard turn starting group.
     * uses reminder in FULL_PERIOD to calculates remaining time to next turn in 1 period.
     * @return seconds to the guard next turn (plus 1 second for insurance)
     */
    static secondsToNextTurn = (): number => {
        const startingTimeStamp = Math.round(Date.now() / 1000)
        const currentTurn = startingTimeStamp % this.FULL_PERIOD()
        const guardTurn = guardConfig.guardId * this.TURNS_LENGTH

        return (guardTurn - currentTurn + this.FULL_PERIOD()) % this.FULL_PERIOD() + 1 // (plus 1 second for insurance)
    }

    /**
     * splits timestamp into guardsLen * TURNS_LENGTH groups. calculates current group.
     * splits group into TURNS_LENGTH places.
     *  if current place is passed by UP_TIME_LENGTH, it's in free gap.
     *  if not, splits place into guardsLen stages. stage number shows guards turn.
     * @return which guard should create in current turn (-1 if it's in gap, i.e. last minute of each guard turn)
     */
    static guardTurn = (): number => {
        const currentTimeStamp = Math.round(Date.now() / 1000)
        const currentTurn = currentTimeStamp % this.FULL_PERIOD()

        if (currentTurn % this.TURNS_LENGTH > this.UP_TIME_LENGTH) return -1
        else return Math.floor(currentTurn / this.TURNS_LENGTH) % guardConfig.guardsLen
    }

    /**
     * @return remaining seconds to current guard turn
     */
    static secondsToReset = () => {
        const currentTimeStamp = Math.round(Date.now() / 1000)
        const currentPoint = currentTimeStamp % this.TURNS_LENGTH
        return (this.UP_TIME_LENGTH - currentPoint + this.TURNS_LENGTH) % this.TURNS_LENGTH + 1 // (plus 1 second for insurance)
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

    /**
     * converts hex string to bytearray
     */
    static hexStringToUint8Array = (str: string): Uint8Array => {
        return Buffer.from(str, "hex")
    }

    /**
     * converts bytearray to hex string
     */
    static Uint8ArrayToHexString = (bytes: Uint8Array): string => {
        return Buffer.from(bytes).toString("hex")
    }

    /**
     * converts base64 string to bytearray
     */
    static base64StringToUint8Array = (str: string): Uint8Array => {
        return Buffer.from(str, "base64")
    }

    /**
     * converts bytearray to base64 string
     */
    static Uint8ArrayToBase64String = (bytes: Uint8Array): string => {
        return Buffer.from(bytes).toString("base64")
    }

    /**
     * converts sourceTxId to eventId (calculates blake2b hash of it)
     * @param txId
     */
    static txIdToEventId = (txId: string): string => {
        return Buffer.from(Encryption.blake2bHash(txId)).toString("hex")
    }

}

export default Utils
