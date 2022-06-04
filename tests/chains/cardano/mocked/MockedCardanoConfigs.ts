import { spy, when } from "ts-mockito";
import CardanoConfigs from "../../../../src/chains/cardano/helpers/CardanoConfigs";


// test configs
const testAssetFingerprintUnitTuples: Map<string, Uint8Array> = new Map([
    ["asset1nl0puwxmhas8fawxp8nx4e2q3wekg969n2auw3", Buffer.from("7eae28af2208be856f7a119668ae52a49b73725e326dc16579dcc37e", "hex")]
])

const mockedCardanoConfigs = spy(CardanoConfigs)

// mock configs
when(mockedCardanoConfigs.assetFingerprintUnitTuples).thenReturn(testAssetFingerprintUnitTuples)
