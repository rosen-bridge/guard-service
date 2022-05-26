import { ErgoBlockHeader } from "../../../../src/chains/ergo/models/Interfaces";

class TestData {

    /**
     * a mocked data that represents 10 block headers
     */
    static mockedBlockHeaderJson: ErgoBlockHeader[] = Array.apply(null, Array(10)).map((_: ErgoBlockHeader) => {
        return {
            "extensionId": "0000000000000000000000000000000000000000000000000000000000000000",
            "difficulty": "5275058176",
            "votes": "000000",
            "timestamp": 0,
            "size": 220,
            "stateRoot": "000000000000000000000000000000000000000000000000000000000000000000",
            "height": 100000,
            "nBits": 0,
            "version": 2,
            "id": "0000000000000000000000000000000000000000000000000000000000000000",
            "adProofsRoot": "0000000000000000000000000000000000000000000000000000000000000000",
            "transactionsRoot": "0000000000000000000000000000000000000000000000000000000000000000",
            "extensionHash": "0000000000000000000000000000000000000000000000000000000000000000",
            "powSolutions": {
                "pk": "03702266cae8daf75b7f09d4c23ad9cdc954849ee280eefae0d67bd97db4a68f6a",
                "w": "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
                "n": "000000019cdfb631",
                "d": 0
            },
            "adProofsId": "0000000000000000000000000000000000000000000000000000000000000000",
            "transactionsId": "0000000000000000000000000000000000000000000000000000000000000000",
            "parentId": "0000000000000000000000000000000000000000000000000000000000000000"
        }
    })

}

export default TestData
