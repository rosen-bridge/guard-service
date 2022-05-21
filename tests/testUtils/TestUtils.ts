class TestUtils {

    /**
     * generates 32 bytes random data used for the identifiers such as txId
     */
    static generateRandomId = (): string => require('crypto').randomBytes(32).toString('hex')

}

export default TestUtils
