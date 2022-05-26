import { spy, when } from "ts-mockito";
import ErgoConfigs from "../../../../src/chains/ergo/helpers/ErgoConfigs";

// TODO: read these parameters from test version of config file ?
// test configs
const testBankAddress: string = "9hPoYNQwVDbtAyt5uhYyKttye7ZPzZ7ePcc6d2rgKr9fiZm6DhD"
const testMinimumErg: bigint = BigInt("100000")
const testTxFee: bigint = BigInt("1500000")

let mockedCardanoConfigs = spy(ErgoConfigs)

// mock configs
when(mockedCardanoConfigs.bankAddress).thenReturn(testBankAddress)
when(mockedCardanoConfigs.minimumErg).thenReturn(testMinimumErg)
when(mockedCardanoConfigs.txFee).thenReturn(testTxFee)
