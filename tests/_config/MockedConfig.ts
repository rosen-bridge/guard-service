import { guardConfig } from "../../src/helpers/GuardConfig";
import { spy, when } from "ts-mockito";

const guardPks = [
    "021865b3f14e3aa9a6845a773c11c6cb1be60370ea5547fd5ebf3d00951cc8c72b",
    "03a6ac9cfb90dac2b1b11b2f43cdfc5f28fbc91aebd0476cab631ac1c13f7b47f5",
    "020ebc48143f8a76cfb7c5cdf7ee12f8af7ef0979b35578f0d417817e6c401afca",
    "0304d2bb1ba1d96c0eccedb0944bced5eb802b7c6783c7009f47ee39173a44e656",
    "0205e9f3b6f854d151c187a2281172c978cd635226cd26751ab2adf72b6f5f6780",
    "02afc76df1afc42990f0f2f3c3f6265b14498468189666cd5de35002a55eed3e7a"
]

const spyGuardConfig = spy(guardConfig)
when(spyGuardConfig.publicKeys).thenReturn(guardPks)
when(spyGuardConfig.requiredSign).thenReturn(5)
when(spyGuardConfig.guardsLen).thenReturn(7)
