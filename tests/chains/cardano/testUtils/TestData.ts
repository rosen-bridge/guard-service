import testUtils from "../../../testUtils/TestUtils";
import TestUtils from "../../../testUtils/TestUtils";
import ChainsConstants from "../../../../src/chains/ChainsConstants";

class TestData {

    static mockTxUtxo = (txId: string, boxesLen: number, boxAddr: string): string => {

        const mockUtxos = (boxesLen: number, boxAddr: string): string => {
            const boxes: string[] = []
            for (let i = 0; i < boxesLen; i++)
                boxes.push(`{
                "address": "${boxAddr}",
                "amount": [
                    {
                        "unit": "lovelace",
                        "quantity": "6000000"
                    }
                ],
                "output_index": ${i},
                "collateral": false,
                "data_hash": null,
                "inline_datum": null,
                "reference_script_hash": null
            }`)
            return boxes.join(",")
        }

        return `{
            "hash": "${txId}",
            "inputs": [
                {
                    "address": "",
                    "amount": [
                        {
                            "unit": "lovelace",
                            "quantity": "1000000000"
                        }
                    ],
                    "tx_hash": "${testUtils.generateRandomId()}",
                    "output_index": 0,
                    "collateral": false,
                    "data_hash": null,
                    "inline_datum": null,
                    "reference_script_hash": null,
                    "reference": false
                }
            ],
            "outputs": [
                ${(mockUtxos(boxesLen, boxAddr))}
            ]
        }`
    }

    static mockAddressUtxo = (boxTxs: string[], boxIndexes: number[]): string => {

        const mockUtxo = (txId: string, txIndex: number): string => {
            return `{
                "tx_hash": "${txId}",
                "tx_index": ${txIndex},
                "output_index": ${txIndex},
                "amount": [
                    {
                        "unit": "lovelace",
                        "quantity": "1500000"
                    }
                ],
                "block": "${TestUtils.generateRandomId()}",
                "data_hash": null,
                "inline_datum": null,
                "reference_script_hash": null
            }`
        }

        const boxes: string[] = []
        for (let i = 0; i < boxTxs.length; i++)
            boxes.push(mockUtxo(boxTxs[i], boxIndexes[i]))

        return `[
            ${boxes.join(",")}
        ]`
    }

    static adaPaymentTransaction = (eventId: string): string => {
        return `{
            "network": "${ChainsConstants.cardano}",
            "txId": "0f5ace462cf496b32c4f05a051e8a9bee2f4d6c95087e77cb6170f27d55752d0",
            "eventId": "${eventId}",
            "txBytes": "84a400838258209e8d19d54c2850f702039eeed1f27f7c2756171512ea25ac5aaae8102ec2677f0082582066a177cf4f070f85b54785e7a93fb76710f84caa7e14d2711eebe8a050db2af200825820631114d5565c3abb0a893e70aadf043dc0868ecaf29e038ac949883a2a7cccc402018282583900271c90846c04b24ed652626ade0915756f813a34f015676556d0b8816c60bd37151b14e7aa22b680c6961057151569e23b019a4276be40941a02faf08082583900f75bf4c647e94b0057086306f4f72f8a8336b8ec171abd8fcdde1a80418b2d81de40eb185e0a0c01f5b47dd3764e609fc088d8766695b760821a055a3d40a2581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a1401864581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37ea140185f021a00030d40031a0089f094a0f5f6",
            "txType": "payment"
        }`
    }

    static tllPastAssetPaymentTx = (eventId: string): string => {
        return `{
            "network": "${ChainsConstants.cardano}",
            "txId": "a85c4944301fdd1b1adf13bd2aef8588079927b4a466b7097fdbc18ce1502053",
            "eventId": "${eventId}",
            "txBytes": "84a40083825820ccbed2ea51a99add35111213ece43fc34e086515478fe0cce7c6d86f2c97f76200825820194ed56ae4c55b2bdc32e6a8e421fbed39a1b036e2ce8f0520502259e0eee4aa008258205411f24ada5eaa748bd808f7e045e67b410e22872ff2e3cb953a55031c8cc6d902018282583900271c90846c04b24ed652626ade0915756f813a34f015676556d0b8816c60bd37151b14e7aa22b680c6961057151569e23b019a4276be4094821a00172698a1581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37ea140184182583900f75bf4c647e94b0057086306f4f72f8a8336b8ec171abd8fcdde1a80418b2d81de40eb185e0a0c01f5b47dd3764e609fc088d8766695b760821a083e0728a2581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a1401864581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37ea140181e021a00030d40031a007aae4aa0f5f6",
            "txType": "payment"
        }`
    }

}

export default TestData
