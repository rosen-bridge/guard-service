// Synthetic scalar 1; never use these public test keys for funds.
/** Publicly known scalar 1 used only by deterministic signing fixtures. */
export const privateKeyHex = '00'.repeat(31) + '01';
/** Compressed public key corresponding to the deterministic scalar-1 fixture. */
export const publicKey =
  '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798';
/** Ordinary P2PKH treasury script matching the synthetic public key. */
export const treasuryScript =
  '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac';

// Independently serialized with Node Buffer/crypto, not the runtime BCH helpers.
// BCH ForkID specification 3e2e6da8c38dab7ba12149d327bc4b259aaad684,
// spec/replay-protected-sighash.md, ALL|FORKID, two ordered inputs.
/** Independently serialized two-output parent used for prevout authentication. */
export const parentHex =
  '020000000111111111111111111111111111111111111111111111111111111111111111110000000000ffffffff0250c30000000000001976a914751e76e8199196d454941c45d1b3a323f1433bd688ac409c0000000000001976a914751e76e8199196d454941c45d1b3a323f1433bd688ac00000000';
/** Pinned double-SHA256 identifier of the independently serialized parent. */
export const parentId =
  'b960ef7b5d7cb9b3d92868a74c67628f47ac69ea51251e75185cd39cc0b8ad60';
/** Pinned unsigned payment bytes spending the two authenticated outputs. */
export const unsignedHex =
  '020000000260adb8c09cd35c18751e2551ea69ac478f62674ca76828d9b3b97c5d7bef60b90000000000feffffff60adb8c09cd35c18751e2551ea69ac478f62674ca76828d9b3b97c5d7bef60b90100000000feffffff01a85b0100000000001976a914751e76e8199196d454941c45d1b3a323f1433bd688ac00000000';
/** Pinned identifier of the unsigned payment body before signature materialization. */
export const approvalId =
  'a0820c081a17fb1ef12c3eeb839bc149c40f3c996ec918f2e3ec2195242b3e55';
/** Independent fork-ID signature preimage for the first payment input. */
export const firstPreimage =
  '02000000b9ebfe4521d196f64f64f1340f8bf6c3d7f89bfadd78d942b8380af7a9500321c992651ac89a97aecd0811c1761915a8e2c8f5153d1bdd994a789e6bd86ab71760adb8c09cd35c18751e2551ea69ac478f62674ca76828d9b3b97c5d7bef60b9000000001976a914751e76e8199196d454941c45d1b3a323f1433bd688ac50c3000000000000feffffffbfde3486f92385a05331793908d2d18d31c22571b1110f42e711c9d5559fdcbd0000000041000000';
/** Independent double-SHA256 digest of the first fork-ID preimage. */
export const firstDigest =
  '00848b2b0c44d580f72cc129155ef995002390d75648a33c83071d0466e6cc84';
