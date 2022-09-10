import { ContractConfig, rosenConfig } from "../../src/helpers/RosenConfig";
import ChainsConstants from "../../src/chains/ChainsConstants";
import { spy, when } from "ts-mockito";
import Configs from "../../src/helpers/Configs";
import { TokenMap } from "@rosen-bridge/tokens";
import testTokens from './tokens.test.json' assert { type: "json" };

const mockedErgoConfig = new ContractConfig("tests/_mockedConfig/addresses/test-contracts-ergo.json")
const mockedCardanoConfig = new ContractConfig("tests/_mockedConfig/addresses/test-contracts-cardano.json")
const contracts = new Map<string, ContractConfig>()
contracts.set(ChainsConstants.ergo, mockedErgoConfig)
contracts.set(ChainsConstants.cardano, mockedCardanoConfig)

const rosenConfigSpy = spy(rosenConfig)
when(rosenConfigSpy.contracts).thenReturn(contracts)

const spyConfig = spy(Configs)
when(spyConfig.tokenMap).thenReturn(new TokenMap(testTokens))
