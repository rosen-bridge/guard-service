/** Malformed legacy envelope whose row identity remains usable for provider checks. */
export const malformedLegacyRecord = {
  txId: 'legacy-transaction',
  chain: 'cardano',
  type: 'cold',
  txJson: 'not-json',
  lastCheck: 100,
};
