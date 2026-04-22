export const HANDSHAKE_CHAIN = 'handshake';
export const HNS = 'hns';

export const HANDSHAKE_TX_BASE_SIZE = 40; // Weight units (base transaction overhead)
// P2WPKH-like input in hsd:
// - base: 40 bytes * 4 = 160 WU
// - witness: 101 bytes (2 stack items, fixed-size 64-byte sig + sighash, pubkey)
export const HANDSHAKE_INPUT_SIZE = 261; // Weight units
// Handshake output includes address + covenant, which is 32 bytes for P2WPKH/NONE
export const HANDSHAKE_OUTPUT_SIZE = 128; // Weight units

export const TSS_SIGNATURE_SIZE = 64;
export const SIGHASH_ALL_SIZE = 1;
export const WITNESS_SIGNATURE_SIZE = TSS_SIGNATURE_SIZE + SIGHASH_ALL_SIZE;

export const CONFIRMATION_TARGET = 6;

export const MINIMUM_UTXO_VALUE = 1000n;
