const guardBox = {
  items: [
    {
      boxId: '3f5baedbad1d6379d3d962ddeae8bf799f966e6e308c374e2ac3c22ae791a2fb',
      transactionId:
        '2067b19f665d491a4f79409c896ec051d2acff7b1726c57e4bc6192ecc9f03d0',
      blockId:
        'cc8335b1044207397c5aa1dc2ca3db467c4e23d0ee3a87476692525ccc044e27',
      value: BigInt(1100000),
      index: 0,
      globalIndex: 622799,
      creationHeight: 290541,
      settlementHeight: 290543,
      ergoTree:
        '100504000400040004000402d802d601c2a7d602b2a5730000ea02d196830301937201c2b2a473010093c272027201938cb2db63087202730200018cb2db6308a77303000198b2e4c6a70510730400ade4c6a7041ad901030ecdee7203',
      address:
        'MZ4DGXjbMTDYv4wnEPCSzRGp3infV4oBqQvJhnnePTb61wYrGaS2oiNAbesgJphKS3v5tA3cqaEXUdgRP5EsKBihXwSSogs4RNVhhsYyQiYHoWNo3jB7Fm2DDQSVLJZCf41sd',
      assets: [
        {
          tokenId:
            'a337e33042eaa1da67bcc7dfa5fcc444f63b8a695c9786494d7d22293eba542e',
          index: 0,
          amount: BigInt(1),
          name: null,
          decimals: null,
          type: null,
        },
      ],
      additionalRegisters: {
        R4: {
          serializedValue:
            '1a0721021865b3f14e3aa9a6845a773c11c6cb1be60370ea5547fd5ebf3d00951cc8c72b21025ea4af07fee449c8c2458f64c271fc979e871d9b8125e4d89e0543531bf415722103a6ac9cfb90dac2b1b11b2f43cdfc5f28fbc91aebd0476cab631ac1c13f7b47f521020ebc48143f8a76cfb7c5cdf7ee12f8af7ef0979b35578f0d417817e6c401afca210304d2bb1ba1d96c0eccedb0944bced5eb802b7c6783c7009f47ee39173a44e656210205e9f3b6f854d151c187a2281172c978cd635226cd26751ab2adf72b6f5f67802102afc76df1afc42990f0f2f3c3f6265b14498468189666cd5de35002a55eed3e7a',
          sigmaType: 'Coll[Coll[SByte]]',
          renderedValue:
            '[021865b3f14e3aa9a6845a773c11c6cb1be60370ea5547fd5ebf3d00951cc8c72b,025ea4af07fee449c8c2458f64c271fc979e871d9b8125e4d89e0543531bf41572,03a6ac9cfb90dac2b1b11b2f43cdfc5f28fbc91aebd0476cab631ac1c13f7b47f5,020ebc48143f8a76cfb7c5cdf7ee12f8af7ef0979b35578f0d417817e6c401afca,0304d2bb1ba1d96c0eccedb0944bced5eb802b7c6783c7009f47ee39173a44e656,0205e9f3b6f854d151c187a2281172c978cd635226cd26751ab2adf72b6f5f6780,02afc76df1afc42990f0f2f3c3f6265b14498468189666cd5de35002a55eed3e7a]',
        },
        R5: {
          serializedValue: '10020a0c',
          sigmaType: 'Coll[SInt]',
          renderedValue: '[5,6]',
        },
      },
      spentTransactionId: null,
      mainChain: true,
    },
  ],
  total: 1,
};

const guardPks = [
  '021865b3f14e3aa9a6845a773c11c6cb1be60370ea5547fd5ebf3d00951cc8c72b',
  '025ea4af07fee449c8c2458f64c271fc979e871d9b8125e4d89e0543531bf41572',
  '03a6ac9cfb90dac2b1b11b2f43cdfc5f28fbc91aebd0476cab631ac1c13f7b47f5',
  '020ebc48143f8a76cfb7c5cdf7ee12f8af7ef0979b35578f0d417817e6c401afca',
  '0304d2bb1ba1d96c0eccedb0944bced5eb802b7c6783c7009f47ee39173a44e656',
  '0205e9f3b6f854d151c187a2281172c978cd635226cd26751ab2adf72b6f5f6780',
  '02afc76df1afc42990f0f2f3c3f6265b14498468189666cd5de35002a55eed3e7a',
];

export { guardBox, guardPks };
