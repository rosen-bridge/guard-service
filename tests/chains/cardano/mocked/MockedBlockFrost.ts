import { spy, when } from "ts-mockito";
import BlockFrostApi from "../../../../src/chains/cardano/network/BlockFrostApi";
import TestConfigs from "../../../testUtils/TestConfigs";


// test configs
const testCurrentSlot: number = TestConfigs.cardano.currentSlot

const mockedBlockFrost = spy(BlockFrostApi)
when(mockedBlockFrost.currentSlot()).thenResolve(testCurrentSlot)
