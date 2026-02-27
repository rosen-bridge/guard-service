export const HANDSHAKE_CHAIN = 'handshake';
export const HNS = 'hns';

export const HANDSHAKE_TX_BASE_SIZE = 40; // Weight units (base transaction overhead)
// P2WPKH-like input in hsd:
// - base: 40 bytes * 4 = 160 WU
// - witness: up to 109 bytes (2 stack items, max DER sig + sighash, pubkey)
export const HANDSHAKE_INPUT_SIZE = 269; // Weight units
// Handshake output includes address + covenant, which is 32 bytes for P2WPKH/NONE
export const HANDSHAKE_OUTPUT_SIZE = 128; // Weight units

export const CONFIRMATION_TARGET = 6;

export const MINIMUM_UTXO_VALUE = 1000n;
