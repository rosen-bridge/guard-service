import { spy, when } from "ts-mockito";
import BlockFrostApi from "../../../../src/chains/cardano/network/BlockFrostApi";

// test configs
const testCurrentSlot: Promise<number> = new Promise<number>((resolve, reject) => resolve(8040020))

const mockedBlockFrost = spy(BlockFrostApi)
when(mockedBlockFrost.currentSlot()).thenReturn(testCurrentSlot)
