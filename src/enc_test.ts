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
    "0302e57ca7ebf8cfa1802d4bc79a455008307a936b4f50f0629d9bef484fdd5189",
    "0399f5724bbc4d08c6e146d61449c05a3e0546868b1d4f83411f325187d5ca4f85",
    "024e06e6c6073e13a03fa4629882a69108cd60e0a9fbb2e0fcc898ce68a7051b66",
    "027a069cc972fc7816539a316ba1cfc0164656d63dd1873ee407670b0e8195f3bd",
]

const secrets = [
    "00eda6c0e9fc808d4cf050fc4e98705372b9f0786a6b63aa4013d1a20539b104",
    "cc2e48e5e53059e0d68866eff97a6037cb39945ea9f09f40fcec82d12cd8cb8b",
    "c97250f41cfa8d545c2f8d75b2ee24002b5feec32340c2bb81fa4e2d4c7527d3",
    "53ceef0ece83401cf5cd853fd0c1a9bbfab750d76f278b3187f1a14768d6e9c4",
]

secrets.forEach(item => {
    const sk = wasm.SecretKey.dlog_from_bytes(Uint8Array.from(Buffer.from(item, 'hex')))
    console.log(sk.get_address().to_base58(wasm.NetworkPrefix.Mainnet))
})
const index = parseInt(process.argv[2] as string)
const secret = secrets[index]
console.log(secret)

const handler = new MultiSigHandler(publicKeys, secret)

const box1 = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from("80ade204100504000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b27203730300720498b272037304007204d18b0f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a04210302e57ca7ebf8cfa1802d4bc79a455008307a936b4f50f0629d9bef484fdd5189210399f5724bbc4d08c6e146d61449c05a3e0546868b1d4f83411f325187d5ca4f8521024e06e6c6073e13a03fa4629882a69108cd60e0a9fbb2e0fcc898ce68a7051b6621027a069cc972fc7816539a316ba1cfc0164656d63dd1873ee407670b0e8195f3bd1002060865c7e0d4a77ccd605b3e4812d38140f7e68fdf740cb6cdc1d8957b75138d1e4c00", "hex")))
const box2 = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from("80c8afa02510010e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac853d1aea4d9010163aedb63087201d901034d0e938c7203017300d18b0f00002eca6f88ea99fb4fe313d94cb05c576b1b7a94ec7166aec958b36bcea4b8ff1a01", "hex")))
const boxes = wasm.ErgoBoxes.empty()
boxes.add(box1)
boxes.add(box2)
console.log(box1.to_json())
console.log(box2.to_json())

const reduced = wasm.ReducedTransaction.sigma_parse_bytes(Uint8Array.from(Buffer.from("ce04022f4cd0df4db787875b3a071e098b72ba4923bd2460e08184b34359563febe04700005e8269c8e2b975a43dc6e74a9c5b10b273313c6d32c1dd40c171fc0a8852ca0100000001a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530480ade204100504000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b27203730300720498b272037304007204d18b0f010001021a04210302e57ca7ebf8cfa1802d4bc79a455008307a936b4f50f0629d9bef484fdd5189210399f5724bbc4d08c6e146d61449c05a3e0546868b1d4f83411f325187d5ca4f8521024e06e6c6073e13a03fa4629882a69108cd60e0a9fbb2e0fcc898ce68a7051b6621027a069cc972fc7816539a316ba1cfc0164656d63dd1873ee407670b0e8195f3bd100206088094ebdc030008cd0314368e16c9c99c5a6e20dda917aeb826b3a908becff543b3a36b38e6b3355ff5d18b0f0000c0843d1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304d18b0f0000c0af87c3210008cd0314368e16c9c99c5a6e20dda917aeb826b3a908becff543b3a36b38e6b3355ff5d18b0f00009702980304cd0302e57ca7ebf8cfa1802d4bc79a455008307a936b4f50f0629d9bef484fdd5189cd0399f5724bbc4d08c6e146d61449c05a3e0546868b1d4f83411f325187d5ca4f85cd024e06e6c6073e13a03fa4629882a69108cd60e0a9fbb2e0fcc898ce68a7051b66cd027a069cc972fc7816539a316ba1cfc0164656d63dd1873ee407670b0e8195f3bd9604cd0302e57ca7ebf8cfa1802d4bc79a455008307a936b4f50f0629d9bef484fdd5189cd0399f5724bbc4d08c6e146d61449c05a3e0546868b1d4f83411f325187d5ca4f85cd024e06e6c6073e13a03fa4629882a69108cd60e0a9fbb2e0fcc898ce68a7051b66cd027a069cc972fc7816539a316ba1cfc0164656d63dd1873ee407670b0e8195f3bdf39b03d3cb9e02d073", "hex")))
const sks = new wasm.SecretKeys()
secrets.forEach(item => sks.add(wasm.SecretKey.dlog_from_bytes(Uint8Array.from(Buffer.from(item, "hex")))))
const prover = wasm.Wallet.from_secrets(sks)
const signed = prover.sign_reduced_transaction(reduced)
console.log(JSON.stringify(signed.to_json()))

// box1.register_value(4)?.to_coll_coll_byte().forEach(item => console.log(Buffer.from(item).toString("hex")))
// setTimeout(() => {
//     handler.sign(reduced, 3, [box1, box2]).then(transaction => console.log(transaction.to_json())).catch(e => console.log(e))
// }, 5000)
//
