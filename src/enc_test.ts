import * as wasm from 'ergo-lib-wasm-nodejs';
import { MultiSigHandler } from "./guard/multisig/MultiSig";
import nodeApi from "./chains/ergo/network/NodeApi";


// Test Scenario
// create address
// create a transaction
// create multi-sig boxes
// send transaction to multi-sig processing loop
// wait until signing completed

const secrets = [
    '5bc1d17d0612e696a9138ab8e85ca2a02d0171440ec128a9ad557c28bd5ea046',
    '168e8fee8ac6965832d6c1c17cdf60c1b582b09f293d8bd88231e32740e3b24f',
    '03a9aab8fa8199b738ba25dfa01be563f291e6a2c2bffbf975627bd82f11dcbf',
    'c6f3da0c57da4e2af823c64b8ca052359ed2abe606841e3939b399bc4c94c7af',
]
const publicKeys = [
    '028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8',
    '03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364',
    '0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410',
    '023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e',
]
const box1Hex = '80a8d6b907100304000e20a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac8530400d801d601b2db6501fe730000ea02d1aedb63087201d901024d0e938c720201730198b2e4c672010510730200ade4c67201041ad901020ecdee72028cc10f00003a4f8dac9bbe80fffaf400edd5779b7ccd5628beceab06c41b5b7b3e091e963501'
const dataBoxHex = '80ade2041006040004000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b2e4c6b2db6501fe7303000510730400720498b2720373050072048cc10f01a6ac381e6fa99929fd1477b3ba9499790a775e91d4c14c5aa86e9a118dfac85301021a0421028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb82103074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364210300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee41021023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2e100206081d827c338829135cc5c7d7f03ad9ba8ecffc6f5cddf63a2655c55922786230c000'
const reducedTxHex = '930201a659c9b48cfe3886f1cffdaa0652b580c8361c8e939ff42f133131cb28be3c73000001c65d5ecf7ded76f7a1443c7876318ded7759ed758f1fe61f951926f12fbd512e00038094ebdc030008cd02697bb0818896761dc3cb4600610f11f03f7ae708a1519cc8325634fafc43dca78cc10f0000c0843d1005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a573048cc10f0000c08faedc030008cd02697bb0818896761dc3cb4600610f11f03f7ae708a1519cc8325634fafc43dca78cc10f0000980304cd028d938d67befbb8ab3513c44886c16c2bcd62ed4595b9b216b20ef03eb8fb8fb8cd03074e09c476bb215dc3aeff908d0b7691895a99dfc3bd950fa629defe541e0364cd0300e8750a242ee7d78f5b458e1f7474bd884d2b7894676412ba6b5f319d2ee410cd023a5b48c87cd9fece23f5acd08cb464ceb9d76e3c1ddac08206980a295546bb2eaafd03f060'

const index = parseInt(process.argv[2] as string)
const secret = secrets[index]

const handler = new MultiSigHandler(publicKeys, secret)

const box1 = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from(box1Hex, "hex")))
const dataBox = wasm.ErgoBox.sigma_parse_bytes(Uint8Array.from(Buffer.from(dataBoxHex, "hex")))
const reduced = wasm.ReducedTransaction.sigma_parse_bytes(Uint8Array.from(Buffer.from(reducedTxHex, "hex")))
// const sks = new wasm.SecretKeys()
// secrets.slice(0, 3).forEach(item => sks.add(wasm.SecretKey.dlog_from_bytes(Uint8Array.from(Buffer.from(item, "hex")))))
// const prover = wasm.Wallet.from_secrets(sks)
// console.log(JSON.stringify(prover.generate_commitments_for_reduced_transaction(reduced)))
// const signed = prover.sign_reduced_transaction(reduced)
// // console.log(JSON.stringify(signed.to_json()))
//
// // box1.register_value(4)?.to_coll_coll_byte().forEach(item => console.log(Buffer.from(item).toString("hex")))
setTimeout(() => {
    handler.sendRegister().then(() => {
        setTimeout(() => {
            handler.sign(reduced, 3, [box1], [dataBox]).then(transaction => console.log(transaction.to_json())).catch(e => console.log(e))
        }, 5000)
    })
}, 5000)

