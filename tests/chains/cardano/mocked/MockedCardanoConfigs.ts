import { spy, when } from "ts-mockito";
import CardanoConfigs from "../../../../src/chains/cardano/helpers/CardanoConfigs";
import { BigNum } from "@emurgo/cardano-serialization-lib-nodejs";

// TODO: read these parameters from test version of config file ?
// test configs
const testBankAddress = "addr_test1qrm4haxxgl55kqzhpp3sda8h979gxd4cast340v0eh0p4qzp3vkcrhjqavv9uzsvq86mglwnwe8xp87q3rv8ve54kasqlf7xgl"
const testTxMinimumLovelace: BigNum = BigNum.from_str("1517208")
const testTxFee: BigNum = BigNum.from_str("200000")
const testTxTtl = 1000000

const testAssetFingerprintUnitTuples: Map<string, Uint8Array> = new Map([
    ["asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3", Buffer.from("7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37e", "hex")]
])

const mockedCardanoConfigs = spy(CardanoConfigs)

// mock configs
when(mockedCardanoConfigs.bankAddress).thenReturn(testBankAddress)
when(mockedCardanoConfigs.txMinimumLovelace).thenReturn(testTxMinimumLovelace)
when(mockedCardanoConfigs.txFee).thenReturn(testTxFee)
when(mockedCardanoConfigs.txTtl).thenReturn(testTxTtl)
when(mockedCardanoConfigs.assetFingerprintUnitTuples).thenReturn(testAssetFingerprintUnitTuples)
