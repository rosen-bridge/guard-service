import { spy, when } from "ts-mockito";
import BlockFrostApi from "../../../../src/chains/cardano/network/BlockFrostApi";
import config from "config";


// test configs
const testCurrentSlot: number = config.get<number>('cardano.currentSlot')

const mockedBlockFrost = spy(BlockFrostApi)
when(mockedBlockFrost.currentSlot()).thenResolve(testCurrentSlot)
