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
    "021f332d5c9c9ad17d5e014640080d4ac05b7139fd4757d29381148fb36b2cacf1",
    "03a84064eeb481d281a19e50e55948c4697a5e18118d16d26a735ae917a377f272",
    "0383680ddc08ba85aafbe7b88ce2e29be72d17cf99e615471f8af457038e488343",
    "03afc774ebd132021093eea87d7b01ae2a666b07e8ba39ba380326671c12de6dba",
]
const secrets = [
    "7e7bd8b8c1274d50d39b117df52c581191ef5144ad43d657fe45b76968f72e14",
    "c85fd86e38968ed6aefca67139ea879da2b7c4921c63f0a8ed1dedcb3c1f9b44",
    "da8622657a64bdc7ee140fd6ddfa289a5a273254cc58c369579555f036d19c24",
    "bff57a77fa07d579f635d0eac75e3eb48d220a7be94cb0745e889d0818126587",
]

secrets.forEach(item => {
    const sk = wasm.SecretKey.dlog_from_bytes(Uint8Array.from(Buffer.from(item, 'hex')))
    console.log(sk.get_address().to_base58(wasm.NetworkPrefix.Mainnet))
})
const index = parseInt(process.argv[2] as string)
const secret = secrets[index]
console.log(secret)

const handler = new MultiSigHandler(publicKeys, secret)

const box1 = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from("80ade204100504000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b27203730300720498b272037304007204888a0f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421021f332d5c9c9ad17d5e014640080d4ac05b7139fd4757d29381148fb36b2cacf12103a84064eeb481d281a19e50e55948c4697a5e18118d16d26a735ae917a377f272210383680ddc08ba85aafbe7b88ce2e29be72d17cf99e615471f8af457038e4883432103afc774ebd132021093eea87d7b01ae2a666b07e8ba39ba380326671c12de6dba10020608c869b73a80f771af6beb8b08ad7b6efce3fac8c1730755ea55520246a9aefcb100", "hex")))
const box2 = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from("80c8afa02510010e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac853d1aea4d9010163aedb63087201d901034d0e938c7203017300888a0f0000e7378c2a50d1a44b13a22ba16d0f45c28d9761a48ab290493e3292f1678a907301", "hex")))
const boxes = wasm.ErgoBoxes.empty()
boxes.add(box1)
boxes.add(box2)

// const address = wasm.Address.from_base58("9gH92yjsJCBHwx4fDbXe6j8jLdDBMX3dm6nqwiHhUqyxgNKXmoK")
// const output = new wasm.ErgoBoxCandidateBuilder(
//     wasm.BoxValue.from_i64(wasm.I64.from_str("10000000")),
//     wasm.Contract.pay_to_address(address),
//     0
// ).build()
//
// const selector = new wasm.SimpleBoxSelector()
// const selection = selector.select(boxes, wasm.BoxValue.from_i64(wasm.I64.from_str("11000000")), new wasm.Tokens())
// const tx = wasm.TxBuilder.new(
//     selection,
//     new wasm.ErgoBoxCandidates(output),
//     0,
//     wasm.BoxValue.from_i64(wasm.I64.from_str("1000000")),
//     address,
//     wasm.BoxValue.SAFE_USER_MIN()
// ).build()
// // const tx = wasm.UnsignedTransaction.from_json(txJson)
// const context = await nodeApi.getErgoStateContext()
// const reduced = wasm.ReducedTransaction.from_unsigned_tx(tx, boxes, wasm.ErgoBoxes.empty(), context)
const reduced = wasm.ReducedTransaction.sigma_parse_bytes(Uint8Array.from(Buffer.from("ce0402121d3b2917152438ad64d6668e60c903c13e0fa1f85536c1dbd7ac3276d86bdc0000c753139f655ddcb65866180ab9ee4f1a615b0fc92c3cd788e7447439eb9fabd100000001a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530480ade204100504000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b27203730300720498b272037304007204888a0f010001021a0421021f332d5c9c9ad17d5e014640080d4ac05b7139fd4757d29381148fb36b2cacf12103a84064eeb481d281a19e50e55948c4697a5e18118d16d26a735ae917a377f272210383680ddc08ba85aafbe7b88ce2e29be72d17cf99e615471f8af457038e4883432103afc774ebd132021093eea87d7b01ae2a666b07e8ba39ba380326671c12de6dba100206088094ebdc030008cd03e57d499dd90774bdae191813ebb320b81670887b315deaa7b3bd01292fcb9dcc888a0f0000c0843d1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304888a0f0000c0af87c3210008cd03e57d499dd90774bdae191813ebb320b81670887b315deaa7b3bd01292fcb9dcc888a0f00009702980304cd021f332d5c9c9ad17d5e014640080d4ac05b7139fd4757d29381148fb36b2cacf1cd03a84064eeb481d281a19e50e55948c4697a5e18118d16d26a735ae917a377f272cd0383680ddc08ba85aafbe7b88ce2e29be72d17cf99e615471f8af457038e488343cd03afc774ebd132021093eea87d7b01ae2a666b07e8ba39ba380326671c12de6dba9604cd021f332d5c9c9ad17d5e014640080d4ac05b7139fd4757d29381148fb36b2cacf1cd03a84064eeb481d281a19e50e55948c4697a5e18118d16d26a735ae917a377f272cd0383680ddc08ba85aafbe7b88ce2e29be72d17cf99e615471f8af457038e488343cd03afc774ebd132021093eea87d7b01ae2a666b07e8ba39ba380326671c12de6dbaf39b03d3cb9e02d073", "hex")))
// const sks = new wasm.SecretKeys()
// secrets.forEach(item => sks.add(wasm.SecretKey.dlog_from_bytes(Uint8Array.from(Buffer.from(item, "hex")))))
// Array(sks.len()).fill("").forEach((item, index) => console.log(sks.get(index).get_address().to_base58(wasm.NetworkPrefix.Mainnet)))
// const prover = wasm.Wallet.from_secrets(sks)
// const commitments = prover.generate_commitments_for_reduced_transaction(reduced)
// // console.log(JSON.stringify(commitments.to_json()))
// const signed = prover.sign_reduced_transaction(reduced)
// console.log(JSON.stringify(signed.to_json()))
box1.register_value(4)?.to_coll_coll_byte().forEach(item => console.log(Buffer.from(item).toString("hex")))
setTimeout(() => {
    handler.sign(reduced, 3, [box1, box2]).then(transaction => console.log(transaction.to_json())).catch(e => console.log(e))
}, 5000)

