export const FIRO_CHAIN = 'firo';
export const FIRO = 'firo';

export const CONFIRMATION_TARGET = 10;

// New constants
export const FIRO_TX_BASE_SIZE = 10; // Firo base transaction size in bytes
export const FIRO_INPUT_SIZE = 148; // Typical Firo input size in bytes (non-SegWit)
export const FIRO_OUTPUT_SIZE = 34; // Typical Firo output size in bytes
export const MINIMUM_UTXO_VALUE = 1000000n; // Minimum Firo UTXO value in satoshis
export const FIRO_NETWORK = {
  // Firo network parameters
  messagePrefix: '\x18Firocoin Signed Message:\n',
  bech32: 'firo',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x52,
  scriptHash: 0x07,
  wif: 0xd2,
};
