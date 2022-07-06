import { sign, verify } from "./guard/multisig/Enc";
import * as wasm from 'ergo-lib-wasm-nodejs';
import { MultiSigHandler } from "./guard/multisig/MultiSig";
import { PublishedCommitment } from "./guard/multisig/Interfaces";
import { convertToHintBag } from "./guard/multisig/utils";

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

secrets.forEach(item => {
    const sk = wasm.SecretKey.dlog_from_bytes(Uint8Array.from(Buffer.from(item, 'hex')))
    console.log(sk.get_address().to_base58(wasm.NetworkPrefix.Mainnet))
})
const handler = new MultiSigHandler(publicKeys)
// const tx: wasm.ReducedTransaction;
setTimeout(() => {
//     handler.sign(tx, boxes).then(transaction => console.log(transaction.to_json()))
}, 1000)


//
//
// console.log(wasm.SecretKey.dlog_from_bytes(Configs.secret).get_address().to_ergo_tree().to_base16_bytes())
//
// const reducedHex = "b205023ca296d93ff9e9a12cdfce7e49e7a4457c064037da4dec33dff0df2c19b36f080000f827f3ae144ff623a9102f2d19a4d3e70caabf06df81b1645ef3f66ce2484e1b00000001333333333333333333333333333333333333333333333333333333333333333304e09143100504000400040004000402d804d601b2a5730000d602e4c6a7041ad603e4c6a70510d604ad7202d901040ecdee7204ea02d19683020193c27201c2a7938cb2db63087201730100018cb2db6308a773020001eb02ea02d19683020193e4c67201041a720293e4c672010510720398b27203730300720498b272037304007204bbb00e010001021a072102a0282e89adfbf5fa99088b5203a249a12dcf40443f495563152069221e3d99722103f0a7d2508e4fa9175cc197f7a5a7ca65b67f144b79e50e4044e2daf16f8e624e210343cd834f032618523c59141ca4f20f0802493d3d9cc9d6cc3a464a378a4bcb72210329ed71fa70dadea53b271af948a2a44fbcc2603b84793a5c107062a54b9a77ca21027a4ade22910ca149c967aa743be27e0947f144ed7dc31fcae13fd3c856fa44832102265068b6f04a40a6b6aee88ad1d084d767fc2ae34589b5e8915148acc1d906e72103fabe7fb2e129030b8c6a1b3ffebbeac25b51d6f6fab038ddddd6a5467c2a17531002080c80c2d72f0008cd03f0a7d2508e4fa9175cc197f7a5a7ca65b67f144b79e50e4044e2daf16f8e624ebbb00e0000e091431005040004000e36100204a00b08cd0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798ea02d192a39a8cc7a701730073011001020402d19683030193a38cc7b2a57300000193c2b2a57301007473027303830108cdeeac93b1a57304bbb00e0000a0c0d0ac030008cd02a0282e89adfbf5fa99088b5203a249a12dcf40443f495563152069221e3d9972bbb00e0000980607cd02a0282e89adfbf5fa99088b5203a249a12dcf40443f495563152069221e3d9972cd03f0a7d2508e4fa9175cc197f7a5a7ca65b67f144b79e50e4044e2daf16f8e624ecd0343cd834f032618523c59141ca4f20f0802493d3d9cc9d6cc3a464a378a4bcb72cd0329ed71fa70dadea53b271af948a2a44fbcc2603b84793a5c107062a54b9a77cacd027a4ade22910ca149c967aa743be27e0947f144ed7dc31fcae13fd3c856fa4483cd02265068b6f04a40a6b6aee88ad1d084d767fc2ae34589b5e8915148acc1d906e7cd03fabe7fb2e129030b8c6a1b3ffebbeac25b51d6f6fab038ddddd6a5467c2a1753b78805cd02a0282e89adfbf5fa99088b5203a249a12dcf40443f495563152069221e3d99729d4fd073"
// const reducedBytes = Buffer.from(reducedHex, "hex")
// const reduced = wasm.ReducedTransaction.sigma_parse_bytes(Uint8Array.from(reducedBytes))
//
// const provers = [
//     15996992666424302249549894209946787053722265153909179403710512611542980045927n,
//     112439260919441706070345540336945631713854816904671174176395141304935860709828n,
//     18290595754091792135758572667146548951883083237172456469939499969026464917822n,
//     29248128956290845072011602395423320230412384312120898004978890231758155129210n,
//     98432878354687500432389839530781660546150963665391434689175288735166712832399n,
//     80556798532107219505260627408242206101129518312270502044407238323707850967855n,
//     52181754052370616941982534765160805014576788585480752075790543551689035183543n
// ].map(item => item.toString(16)).map(
//     item => Uint8Array.from(Buffer.from(item, "hex"))
// ).map(item => wasm.SecretKey.dlog_from_bytes(item))
//
// provers.forEach(item => {
//     const secrets = new wasm.SecretKeys()
//     secrets.add(item)
//     const wallet = wasm.Wallet.from_secrets(secrets)
//     const commitments = wallet.generate_commitments_for_reduced_transaction(reduced)
//     console.log(JSON.stringify(commitments.to_json()))
//     console.log("===================================================")
// })

const commitments: PublishedCommitment = {
    "0": {
        a: "0350a5079e32908a12483d60d3fac48776781254928fbdcfd6c48df31535e1ef9a",
        position: "0-1"
    }
}

const newJson = convertToHintBag(commitments, "0343cd834f032618523c59141ca4f20f0802493d3d9cc9d6cc3a464a378a4bcb72").to_json()
console.log(JSON.stringify(newJson))