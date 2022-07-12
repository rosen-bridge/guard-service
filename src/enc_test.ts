import * as wasm from 'ergo-lib-wasm-nodejs';
import { MultiSigHandler } from "./guard/multisig/MultiSig";
import nodeApi from "./chains/ergo/network/NodeApi";



// Test Scenario
// create address
// create a transaction
// create multi-sig boxes
// send transaction to multi-sig processing loop
// wait until signing completed

const publicKeys: Array<string> = [
    "02fc34b896f565c0b930981cbc76e1715fde18c4ecdcb50acc50e42ea17bbb1848",
    "038b6b9465fbb281540dee04a640935ad8d02381dbf4be46665e73d909c2dbedde",
    "0298e8ccf316b98d730a1bfcb25f92754bb5b26ad5547aa5d4179ff41238ddbca9",
    "0229b27ec5733194fb7168312b5264864bde7aff7f873d2cc6121ebe92db112afd"
]
const secrets = [
    "3e600b60d82da99c55959df4bb4ceb139cbe434a948251b371c6d9eeb73cb723",
    "74e7b65055d170d36d4fb926102fe6e047390980f66611f541f1b8268cbd5a25",
    "f5dc049d8f757382d6d537b6ea7324d27b54a59fdefaa60d5ff02a803358a0a0",
    "a5cb9a40da8259d8223d57ec7bc1aefee415b9f558572b41b39f72074d0c77bb"
]

// secrets.forEach(item => {
//     const sk = wasm.SecretKey.dlog_from_bytes(Uint8Array.from(Buffer.from(item, 'hex')))
//     console.log(sk.get_address().to_base58(wasm.NetworkPrefix.Mainnet))
// })
const index = parseInt(process.argv[2] as string)
const secret = secrets[index]
console.log(secret)

const handler = new MultiSigHandler(publicKeys, secret)
const txJson = `{
    "id": "e24ad428da3662ae5a5be8d68e33b43834bcfad00d4661d30341adf0dc669bd7",
    "inputs": [
        {
            "boxId": "435d41e37f49136a214242a5549a9547111198d3df878d3d970d81aed14449cb",
            "extension": {}
        }
    ],
    "dataInputs": [],
    "outputs": [
        {
            "boxId": "0eaafc4509bdb42c3b67391cf671973289295b22360e6749bed11feb2049b3ed",
            "value": 100000000,
            "ergoTree": "0008cd02e7c7c9ff46e5a3390e9f5546013de6700484c59086de40a6f62eabaf18c13483",
            "assets": [],
            "creationHeight": 242118,
            "additionalRegisters": {},
            "transactionId": "e24ad428da3662ae5a5be8d68e33b43834bcfad00d4661d30341adf0dc669bd7",
            "index": 0
        },
        {
            "boxId": "a6baa7ea579fe9d41467599f2e02a6761a137b8a07a3f39b64856f3db0a2797e",
            "value": 1000000,
            "ergoTree": "1005040004000e351002040208cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304",
            "assets": [],
            "creationHeight": 242118,
            "additionalRegisters": {},
            "transactionId": "e24ad428da3662ae5a5be8d68e33b43834bcfad00d4661d30341adf0dc669bd7",
            "index": 1
        },
        {
            "boxId": "58c2a9c8c641a294a3daf042b429d850948428085e55cbd1cdf30067f2cb84c8",
            "value": 899000000,
            "ergoTree": "0008cd02e7c7c9ff46e5a3390e9f5546013de6700484c59086de40a6f62eabaf18c13483",
            "assets": [],
            "creationHeight": 242118,
            "additionalRegisters": {},
            "transactionId": "e24ad428da3662ae5a5be8d68e33b43834bcfad00d4661d30341adf0dc669bd7",
            "index": 2
        }
    ]
}`
const box = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from("8094ebdc031005040608cd02fc34b896f565c0b930981cbc76e1715fde18c4ecdcb50acc50e42ea17bbb184808cd038b6b9465fbb281540dee04a640935ad8d02381dbf4be46665e73d909c2dbedde08cd0298e8ccf316b98d730a1bfcb25f92754bb5b26ad5547aa5d4179ff41238ddbca908cd0229b27ec5733194fb7168312b5264864bde7aff7f873d2cc6121ebe92db112afd9873008304087301730273037304b9e30e00001f28ef197b5e5b856a8ad7325d55a9accdbab908a328ca96ad1d2eb34a6066d300", "hex")))
const boxes = wasm.ErgoBoxes.empty()
boxes.add(box)
const tx = wasm.UnsignedTransaction.from_json(txJson)
const context = await nodeApi.getErgoStateContext()
const reduced = wasm.ReducedTransaction.from_unsigned_tx(tx, boxes, wasm.ErgoBoxes.empty(), context)
// const tx: wasm.ReducedTransaction;
setTimeout(() => {
    handler.sign(reduced, 3, [box]).then(transaction => console.log(transaction.to_json())).catch(e => console.log(e))
}, 5000)

