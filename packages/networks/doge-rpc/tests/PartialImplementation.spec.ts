import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DogeNetworkFunction } from '@rosen-chains/doge';
import DogeRpcNetwork from '../lib/DogeRpcNetwork';
import * as axios from 'axios';

// Mock axios to prevent actual network calls
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ data: {} })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
    })),
  },
}));

describe('DogeRpcNetwork implements property', () => {
  const getSavedTransactionById = async () => undefined;
  const URL = 'doge-rpc-url';
  const TIMEOUT = 1000;

  /**
   * @target DogeRpcNetwork.implements variable should contain exactly the expected network functions
   * @dependencies
   * @scenario
   * - Create instance of DogeRpcNetwork
   * - Check its implements property
   * @expected
   * - implements property should contain the specified DogeNetworkFunction values
   */
  it('should include the correct network function implementations', () => {
    const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);

    const expectedFunctions = [
      DogeNetworkFunction.getHeight,
      DogeNetworkFunction.getBlockTransactionIds,
      DogeNetworkFunction.getBlockInfo,
      DogeNetworkFunction.getTransaction,
      DogeNetworkFunction.submitTransaction,
      DogeNetworkFunction.isBoxUnspentAndValid,
      DogeNetworkFunction.getUtxo,
      DogeNetworkFunction.getFeeRatio,
      DogeNetworkFunction.isTxInMempool,
      DogeNetworkFunction.getTransactionHex,
    ];

    const implementedFunctions = network.implements;

    // Should have the exact list of expected functions
    expect(implementedFunctions.sort()).toEqual(expectedFunctions.sort());
  });

  /**
   * @target Functions declared in implements should not contain 'not implemented' error logic
   * @dependencies
   * @scenario
   * - Create instance of DogeRpcNetwork
   * - Check each function in the implements array
   * @expected
   * - None of the implemented functions should contain the 'not implemented' error message
   */
  it('should not contain "not implemented" error logic in implemented functions', () => {
    const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);

    // For each function in the implements array
    network.implements.forEach((funcName) => {
      // Get the function from the network instance
      const method = network[funcName as keyof typeof network];

      // The method should exist and be a function
      expect(method).toBeDefined();
      expect(typeof method).toBe('function');

      // Convert method to string to check its implementation
      const methodStr = method.toString();

      // Should not contain the "not implemented" error message
      expect(methodStr).not.toContain('Not implemented');
    });
  });

  /**
   * @target Functions that are not in implements should contain 'not implemented' error logic
   * @dependencies
   * @scenario
   * - Create instance of DogeRpcNetwork
   * - Check specific functions that are not implemented
   * @expected
   * - Those functions should contain the 'not implemented' error message
   */
  it('should include "not implemented" error logic in non-implemented functions', () => {
    const network = new DogeRpcNetwork(URL, TIMEOUT, getSavedTransactionById);

    const nonImplementedFunctions = [
      'getTxConfirmation',
      'getAddressAssets',
      'getAddressBoxes',
      'getSpentTransactionByInputId',
    ];

    // For each non-implemented function
    nonImplementedFunctions.forEach((funcName) => {
      // Get the function from the network instance
      const method = network[funcName as keyof typeof network];

      // The method should exist and be a function
      expect(method).toBeDefined();
      expect(typeof method).toBe('function');

      // Convert method to string to check its implementation
      const methodStr = method.toString();

      // Should contain the "not implemented" error message
      expect(methodStr).toContain('Not implemented');
    });
  });
});
