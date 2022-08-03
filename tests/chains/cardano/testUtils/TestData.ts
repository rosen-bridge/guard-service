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
            "txBytes": "84a400838258209e8d19d54c2850f702039eeed1f27f7c2756171512ea25ac5aaae8102ec2677f0082582066a177cf4f070f85b54785e7a93fb76710f84caa7e14d2711eebe8a050db2af200825820631114d5565c3abb0a893e70aadf043dc0868ecaf29e038ac949883a2a7cccc402018282583900271c90846c04b24ed652626ade0915756f813a34f015676556d0b8816c60bd37151b14e7aa22b680c6961057151569e23b019a4276be40941a02faf08082583900f75bf4c647e94b0057086306f4f72f8a8336b8ec171abd8fcdde1a80418b2d81de40eb185e0a0c01f5b47dd3764e609fc088d8766695b760821a055a3d40a2581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc373a1401864581c7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37ea140185f021a00030d40031a0089f094a0f5f6"
        }`
    }

    static tx = {
        "tx_hash": "cf32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa",
        "inputs": [
            {
                "payment_addr": {
                    "bech32": "addr_test1vzg07d2qp3xje0w77f982zkhqey50gjxrsdqh89yx8r7nasu97hr0",
                    "cred": "90ff35400c4d2cbddef24a750ad7064947a2461c1a0b9ca431c7e9f6"
                },
                "stake_addr": null,
                "tx_hash": "9f00d372e930d685c3b410a10f2bd035cd9a927c4fd8ef8e419c79b210af7ba6",
                "tx_index": 1,
                "value": "979445417",
                "asset_list": [
                    {
                        "policy_id": "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2",
                        "asset_name": "646f6765",
                        "quantity": "10000000"
                    },
                    {
                        "policy_id": "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2",
                        "asset_name": "7369676d61",
                        "quantity": "9999978"
                    }
                ]
            }
        ],
        "outputs": [
            {
                "payment_addr": {
                    "bech32": "addr_test1vze7yqqlg8cjlyhz7jzvsg0f3fhxpuu6m3llxrajfzqecggw704re",
                    "cred": "b3e2001f41f12f92e2f484c821e98a6e60f39adc7ff30fb248819c21"
                },
                "stake_addr": null,
                "tx_hash": "cf32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa",
                "tx_index": 0,
                "value": "10000000",
                "asset_list": [
                    {
                        "policy_id": "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2",
                        "asset_name": "7369676d61",
                        "quantity": "10"
                    }
                ]
            },
            {
                "payment_addr": {
                    "bech32": "addr_test1vzg07d2qp3xje0w77f982zkhqey50gjxrsdqh89yx8r7nasu97hr0",
                    "cred": "90ff35400c4d2cbddef24a750ad7064947a2461c1a0b9ca431c7e9f6"
                },
                "stake_addr": null,
                "tx_hash": "cf32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa",
                "tx_index": 1,
                "value": "969261084",
                "asset_list": [
                    {
                        "policy_id": "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2",
                        "asset_name": "646f6765",
                        "quantity": "10000000"
                    },
                    {
                        "policy_id": "ace7bcc2ce705679149746620de3a84660ce57573df54b5a096e39a2",
                        "asset_name": "7369676d61",
                        "quantity": "9999968"
                    }
                ]
            }
        ]
    }

    static txMetaData = {
        "tx_hash": "cf32ad374daefdce563e3391effc4fc42eb0e74bbec8afe16a46eeea69e3b2aa",
        "metadata": {
            "0": {
                "to": "ergo",
                "bridgeFee": "10000",
                "networkFee": "10000",
                "toAddress": "ergoAddress",
                "targetChainTokenId": "cardanoTokenId"
            }
        }
    }

}

export default TestData
